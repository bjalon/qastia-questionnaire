import { parseDocument } from "yaml";
import type {
  CompileFormOptions,
  CompileFormResult,
  CompiledForm,
  CompiledFormElement,
  CompiledFormPage,
  CompiledQuestionElement,
  FormDiagnostic,
  FormNavigationMode,
  FormRuntime,
  FormSource,
  QuestionOption,
} from "../publicTypes";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";
import { rawFormSchema } from "../schema/rawForm.schema";
import { hashSource } from "./hash";
import { diagnostic } from "./diagnostics";
import { rangeFromOffsets } from "./sourceRanges";
import { rangeForPath } from "./sourceMap/yamlRanges";
import { normalizeOptions } from "../questionTypes/defaultQuestionTypes";

const topLevelFields = new Set(["version", "kind", "id", "metadata", "theme", "navigation", "pages"]);
const metadataFields = new Set(["title", "description", "locale"]);
const themeFields = new Set(["id"]);
const navigationFields = new Set(["mode"]);
const pageFields = new Set(["id", "title", "description", "elements"]);
const elementFields = new Set([
  "id",
  "type",
  "questionType",
  "title",
  "description",
  "required",
  "options",
  "config",
  "validation",
]);

export function compileForm(
  source: FormSource,
  runtime: FormRuntime = defaultFormRuntime,
  options: CompileFormOptions = {},
): CompileFormResult {
  const mode = options.mode ?? "authoring";
  const fallback = { source, title: "Formulaire invalide" };
  const diagnostics: FormDiagnostic[] = [];

  let parsed: unknown;
  try {
    const document = parseDocument(source.content, { prettyErrors: false });
    if (document.errors.length > 0) {
      return {
        status: "invalid",
        fallback,
        diagnostics: document.errors.map((error) =>
          diagnostic("YAML_SYNTAX_ERROR", error.message, {
            range: rangeFromOffsets(source.content, error.pos[0], error.pos[1]),
          }),
        ),
      };
    }
    parsed = document.toJSON();
  } catch (error) {
    const message = error instanceof Error ? error.message : "YAML invalide.";
    return {
      status: "invalid",
      fallback,
      diagnostics: [diagnostic("YAML_SYNTAX_ERROR", message)],
    };
  }

  if (!isRecord(parsed)) {
    return {
      status: "invalid",
      fallback,
      diagnostics: [
        diagnostic("SCHEMA_INVALID_VALUE", "La source YAML doit definir un objet racine.", {
          path: [],
        }),
      ],
    };
  }

  const schemaResult = rawFormSchema.safeParse(parsed);
  if (!schemaResult.success) {
    diagnostics.push(
      ...schemaResult.error.issues.map((issue) =>
        diagnostic("SCHEMA_INVALID_VALUE", issue.message, {
          path: issue.path.map(String),
          range: rangeForPath(source.content, issue.path.map(String)),
          severity: mode === "strict" ? "error" : "warning",
        }),
      ),
    );
  }

  diagnostics.push(...unknownFieldDiagnostics(parsed, topLevelFields, [], source.content, mode));

  const blocking = validateHeader(parsed, diagnostics, source.content, mode);
  if (blocking) {
    return { status: "invalid", fallback, diagnostics };
  }

  const metadata = isRecord(parsed.metadata) ? parsed.metadata : {};
  diagnostics.push(...unknownFieldDiagnostics(metadata, metadataFields, ["metadata"], source.content, mode));

  const theme = isRecord(parsed.theme) ? parsed.theme : {};
  diagnostics.push(...unknownFieldDiagnostics(theme, themeFields, ["theme"], source.content, mode));

  const navigation = isRecord(parsed.navigation) ? parsed.navigation : {};
  diagnostics.push(...unknownFieldDiagnostics(navigation, navigationFields, ["navigation"], source.content, mode));

  const form: CompiledForm = {
    id: stringOr(parsed.id, "form"),
    version: 1,
    kind: "form",
    sourceUri: source.uri,
    sourceHash: hashSource(source.content),
    metadata: {
      title: stringOr(metadata.title, "Questionnaire"),
      description: optionalString(metadata.description),
      locale: optionalString(metadata.locale),
    },
    theme: {
      id: resolveThemeId(theme.id, runtime, diagnostics, source.content, mode),
    },
    navigation: resolveNavigationMode(navigation.mode, diagnostics, source.content, mode),
    pages: compilePages(parsed.pages, runtime, diagnostics, source.content, mode),
  };

  const errorDiagnostics = diagnostics.filter((item) => item.severity === "error");
  if (mode === "strict" && errorDiagnostics.length > 0) {
    return { status: "invalid", fallback, diagnostics };
  }

  if (form.pages.length === 0 && mode === "strict") {
    return {
      status: "invalid",
      fallback,
      diagnostics: [
        ...diagnostics,
        diagnostic("SCHEMA_MISSING_FIELD", "Le formulaire doit contenir au moins une page.", {
          path: ["pages"],
        }),
      ],
    };
  }

  return diagnostics.length > 0
    ? { status: "degraded", form, diagnostics }
    : { status: "valid", form, diagnostics: [] };
}

function validateHeader(
  raw: Readonly<Record<string, unknown>>,
  diagnostics: FormDiagnostic[],
  source: string,
  mode: "authoring" | "strict",
): boolean {
  let blocking = false;

  if (raw.version !== 1) {
    diagnostics.push(
      diagnostic("FORM_UNSUPPORTED_VERSION", "Seule la version 1 est supportee.", {
        path: ["version"],
        range: rangeForPath(source, ["version"]),
        hint: "Mettez version: 1 ou migrez la source avant compilation.",
      }),
    );
    blocking = mode === "strict";
  }

  if (raw.kind !== "form") {
    diagnostics.push(
      diagnostic("FORM_INVALID_KIND", 'Le champ kind doit valoir "form".', {
        path: ["kind"],
        range: rangeForPath(source, ["kind"]),
        hint: 'Mettez kind: "form".',
      }),
    );
    blocking = mode === "strict";
  }

  return blocking;
}

function compilePages(
  rawPages: unknown,
  runtime: FormRuntime,
  diagnostics: FormDiagnostic[],
  source: string,
  mode: "authoring" | "strict",
): readonly CompiledFormPage[] {
  if (!Array.isArray(rawPages)) {
    diagnostics.push(
      diagnostic("SCHEMA_MISSING_FIELD", "Le formulaire doit definir pages.", {
        path: ["pages"],
        range: rangeForPath(source, ["pages"]),
        severity: mode === "strict" ? "error" : "warning",
        hint: "Ajoutez au moins une page dans pages.",
      }),
    );
    return mode === "authoring"
      ? [
          {
            id: "page_1",
            title: "Page 1",
            elements: [],
          },
        ]
      : [];
  }

  const seenPageIds = new Set<string>();
  return rawPages
    .filter((page): page is Readonly<Record<string, unknown>> => isRecord(page))
    .map((page, pageIndex) => {
      diagnostics.push(...unknownFieldDiagnostics(page, pageFields, ["pages", String(pageIndex)], source, mode));
      const id = typeof page.id === "string" && page.id.length > 0 ? page.id : `page_${pageIndex + 1}`;
      if (typeof page.id !== "string" || page.id.length === 0) {
        diagnostics.push(
          diagnostic("PAGE_MISSING_ID", "La page doit definir un id.", {
            severity: mode === "strict" ? "error" : "warning",
            path: ["pages", String(pageIndex), "id"],
            range: rangeForPath(source, ["pages", String(pageIndex)]),
            hint: "Ajoutez un id stable a la page.",
          }),
        );
      }

      if (seenPageIds.has(id)) {
        diagnostics.push(
          diagnostic("PAGE_DUPLICATE_ID", `L'id de page "${id}" est duplique.`, {
            path: ["pages", String(pageIndex), "id"],
            range: rangeForPath(source, ["pages", String(pageIndex), "id"]),
            pageId: id,
            hint: "Les ids de pages doivent etre uniques dans tout le formulaire.",
          }),
        );
      }
      seenPageIds.add(id);

      const elements = compileElements(page.elements, runtime, diagnostics, source, id, pageIndex, mode);
      if (elements.length === 0) {
        diagnostics.push(
          diagnostic("PAGE_EMPTY", "La page ne contient aucun element.", {
            severity: mode === "strict" ? "error" : "info",
            path: ["pages", String(pageIndex), "elements"],
            range: rangeForPath(source, ["pages", String(pageIndex), "elements"]),
            pageId: id,
          }),
        );
      }

      return {
        id,
        title: stringOr(page.title, `Page ${pageIndex + 1}`),
        description: optionalString(page.description),
        elements,
      };
    });
}

function compileElements(
  rawElements: unknown,
  runtime: FormRuntime,
  diagnostics: FormDiagnostic[],
  source: string,
  pageId: string,
  pageIndex: number,
  mode: "authoring" | "strict",
): readonly CompiledFormElement[] {
  if (!Array.isArray(rawElements)) {
    diagnostics.push(
      diagnostic("SCHEMA_MISSING_FIELD", "La page doit definir elements.", {
        severity: mode === "strict" ? "error" : "warning",
        path: ["pages", String(pageIndex), "elements"],
        range: rangeForPath(source, ["pages", String(pageIndex), "elements"]),
        pageId,
        hint: "Ajoutez elements: [] ou une liste d'elements.",
      }),
    );
    return [];
  }

  const seenElementIds = new Set<string>();
  const compiled: CompiledFormElement[] = [];

  rawElements.forEach((element, elementIndex) => {
    if (!isRecord(element)) {
      diagnostics.push(
        diagnostic("SCHEMA_INVALID_VALUE", "Un element doit etre un objet.", {
          path: ["pages", String(pageIndex), "elements", String(elementIndex)],
          range: rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex)]),
          pageId,
        }),
      );
      return;
    }

    diagnostics.push(
      ...unknownFieldDiagnostics(
        element,
        elementFields,
        ["pages", String(pageIndex), "elements", String(elementIndex)],
        source,
        mode,
      ),
    );
    const id = typeof element.id === "string" && element.id.length > 0 ? element.id : `${pageId}_element_${elementIndex + 1}`;
    if (typeof element.id !== "string" || element.id.length === 0) {
      diagnostics.push(
        diagnostic("ELEMENT_MISSING_ID", "L'element doit definir un id.", {
          severity: mode === "strict" ? "error" : "warning",
          path: ["pages", String(pageIndex), "elements", String(elementIndex), "id"],
          range: rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex)]),
          pageId,
          elementId: id,
          hint: "Ajoutez un id stable a l'element.",
        }),
      );
    }

    if (seenElementIds.has(id)) {
      diagnostics.push(
        diagnostic("ELEMENT_DUPLICATE_ID", `L'id d'element "${id}" est duplique dans la page.`, {
          path: ["pages", String(pageIndex), "elements", String(elementIndex), "id"],
          range: rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex), "id"]),
          pageId,
          elementId: id,
          hint: "Les ids d'elements doivent etre uniques dans une page.",
        }),
      );
    }
    seenElementIds.add(id);

    const type = typeof element.type === "string" ? element.type : "question";
    if (type === "statement") {
      compiled.push({
        id,
        type: "statement",
        title: stringOr(element.title, "Information"),
        description: optionalString(element.description),
      });
      return;
    }

    if (type !== "question") {
      diagnostics.push(
        diagnostic("ELEMENT_UNKNOWN_TYPE", `Le type d'element "${type}" est inconnu.`, {
          path: ["pages", String(pageIndex), "elements", String(elementIndex), "type"],
          range: rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex), "type"]),
          pageId,
          elementId: id,
          hint: 'Utilisez type: "question" ou type: "statement".',
        }),
      );
      return;
    }

    const question = compileQuestion(element, id, runtime, diagnostics, source, pageId, pageIndex, elementIndex);
    if (question) {
      compiled.push(question);
    }
  });

  return compiled;
}

function compileQuestion(
  element: Readonly<Record<string, unknown>>,
  id: string,
  runtime: FormRuntime,
  diagnostics: FormDiagnostic[],
  source: string,
  pageId: string,
  pageIndex: number,
  elementIndex: number,
): CompiledQuestionElement | null {
  const questionType = typeof element.questionType === "string" ? element.questionType : "";
  const definition = runtime.questionTypes.get(questionType);
  if (!definition) {
    diagnostics.push(
      diagnostic("QUESTION_UNKNOWN_TYPE", `Le type de question "${questionType || "(vide)"}" est inconnu.`, {
        path: ["pages", String(pageIndex), "elements", String(elementIndex), "questionType"],
        range: rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex), "questionType"]),
        pageId,
        elementId: id,
        hint: "Ajoutez le type au runtime ou choisissez un type de question disponible.",
      }),
    );
    return null;
  }

  if (typeof element.title !== "string" || element.title.trim().length === 0) {
    diagnostics.push(
      diagnostic("QUESTION_MISSING_TITLE", "La question doit definir un titre.", {
        path: ["pages", String(pageIndex), "elements", String(elementIndex), "title"],
        range: rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex), "title"]),
        pageId,
        elementId: id,
        hint: "Ajoutez un titre visible par le participant.",
      }),
    );
  }

  const config = definition.normalizeConfig(isRecord(element.config) ? element.config : definition.defaultConfig);
  const question: CompiledQuestionElement = {
    id,
    type: "question",
    questionType,
    title: stringOr(element.title, definition.defaultTitle),
    description: optionalString(element.description),
    required: element.required === true,
    options: normalizeQuestionOptions(element.options),
    config,
    validation: isRecord(element.validation) ? element.validation : {},
  };

  diagnostics.push(
    ...definition.validateConfig(question).map((item) => ({
      ...item,
      path: item.path ?? ["pages", String(pageIndex), "elements", String(elementIndex), "config"],
      range: item.range ?? rangeForPath(source, ["pages", String(pageIndex), "elements", String(elementIndex), "config"]),
      pageId: item.pageId ?? pageId,
      elementId: item.elementId ?? id,
    })),
  );
  return question;
}

function normalizeQuestionOptions(value: unknown): readonly QuestionOption[] {
  return normalizeOptions(value);
}

function resolveThemeId(
  value: unknown,
  runtime: FormRuntime,
  diagnostics: FormDiagnostic[],
  source: string,
  mode: "authoring" | "strict",
): string {
  const requested = typeof value === "string" ? value : "qastia-light";
  if (runtime.themes.has(requested)) {
    return requested;
  }

  diagnostics.push(
    diagnostic("FORM_UNKNOWN_THEME", `Le theme "${requested}" est inconnu.`, {
      severity: mode === "strict" ? "error" : "warning",
      path: ["theme", "id"],
      range: rangeForPath(source, ["theme", "id"]),
      hint: "Ajoutez le theme au runtime ou utilisez un theme disponible.",
    }),
  );
  return "qastia-light";
}

function resolveNavigationMode(
  value: unknown,
  diagnostics: FormDiagnostic[],
  source: string,
  mode: "authoring" | "strict",
): FormNavigationMode {
  if (value === undefined || value === "paged" || value === "single-page") {
    return value === "single-page" ? "single-page" : "paged";
  }

  diagnostics.push(
    diagnostic("FORM_INVALID_NAVIGATION_MODE", 'navigation.mode doit valoir "paged" ou "single-page".', {
      severity: mode === "strict" ? "error" : "warning",
      path: ["navigation", "mode"],
      range: rangeForPath(source, ["navigation", "mode"]),
      hint: 'Utilisez navigation.mode: "paged" pour un formulaire pagine.',
    }),
  );
  return "paged";
}

function unknownFieldDiagnostics(
  record: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: readonly string[],
  source: string,
  mode: "authoring" | "strict",
): readonly FormDiagnostic[] {
  return Object.keys(record)
    .filter((key) => !allowed.has(key))
    .map((key) =>
      diagnostic("SCHEMA_UNKNOWN_FIELD", `Champ inconnu "${key}".`, {
        severity: mode === "strict" ? "error" : "warning",
        path: [...path, key],
        range: rangeForPath(source, [...path, key]),
        hint: "Supprimez ce champ ou ajoutez son support au schema public.",
      }),
    );
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
