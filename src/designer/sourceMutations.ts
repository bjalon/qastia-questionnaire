import YAML from "yaml";
import type {
  FormRuntime,
  FormSource,
  QuestionOption,
} from "../publicTypes";
import type { FormDesignerSelection } from "./types";

type MutableRecord = Record<string, unknown>;

export function updateYamlSource(
  source: FormSource,
  mutate: (form: MutableRecord) => void,
): FormSource {
  const form = parseFormSource(source.content);
  mutate(form);
  return {
    ...source,
    content: YAML.stringify(form, { lineWidth: 0 }),
  };
}

export function updateFormMetadataSource(
  source: FormSource,
  patch: { readonly title?: string; readonly description?: string },
): FormSource {
  return updateYamlSource(source, (form) => {
    const metadata = ensureRecord(form, "metadata");
    applyStringPatch(metadata, "title", patch.title);
    applyStringPatch(metadata, "description", patch.description);
  });
}

export function updatePageSource(
  source: FormSource,
  pageId: string,
  patch: { readonly title?: string; readonly description?: string },
): FormSource {
  return updateYamlSource(source, (form) => {
    const page = findPage(form, pageId);
    if (!page) {
      return;
    }
    applyStringPatch(page, "title", patch.title);
    applyStringPatch(page, "description", patch.description);
  });
}

export function updateElementSource(
  source: FormSource,
  pageId: string,
  elementId: string,
  patch: {
    readonly title?: string;
    readonly description?: string;
    readonly required?: boolean;
    readonly options?: readonly QuestionOption[];
    readonly config?: Readonly<Record<string, unknown>>;
    readonly validation?: Readonly<Record<string, unknown>>;
  },
): FormSource {
  return updateYamlSource(source, (form) => {
    const element = findElement(form, pageId, elementId);
    if (!element) {
      return;
    }
    applyStringPatch(element, "title", patch.title);
    applyStringPatch(element, "description", patch.description);
    if (patch.required !== undefined) {
      element.required = patch.required;
    }
    if (patch.options !== undefined) {
      element.options = patch.options.map((option) => ({
        value: option.value,
        label: option.label,
      }));
    }
    if (patch.config !== undefined) {
      element.config = compactRecord(patch.config);
    }
    if (patch.validation !== undefined) {
      element.validation = compactRecord(patch.validation);
    }
  });
}

export function addPageSource(
  source: FormSource,
  selection: FormDesignerSelection,
): { readonly source: FormSource; readonly pageId: string } {
  let nextPageId = "";
  const nextSource = updateYamlSource(source, (form) => {
    const pages = ensureArray(form, "pages");
    nextPageId = generateId("page", collectPageIds(form));
    const page = {
      id: nextPageId,
      title: `Page ${pages.length + 1}`,
      elements: [],
    };
    const selectedPageIndex = selection.kind === "page" || selection.kind === "element"
      ? pages.findIndex((item) => isRecord(item) && item.id === selection.pageId)
      : -1;
    pages.splice(selectedPageIndex >= 0 ? selectedPageIndex + 1 : pages.length, 0, page);
  });

  return { source: nextSource, pageId: nextPageId };
}

export function addQuestionSource(
  source: FormSource,
  runtime: FormRuntime,
  selection: FormDesignerSelection,
  questionTypeId: string,
): { readonly source: FormSource; readonly pageId: string; readonly elementId: string } {
  let nextPageId = "";
  let nextElementId = "";
  const nextSource = updateYamlSource(source, (form) => {
    const pages = ensureArray(form, "pages");
    if (pages.length === 0) {
      pages.push({ id: "page_1", title: "Page 1", elements: [] });
    }

    const page = resolveTargetPage(pages, selection);
    nextPageId = String(page.id ?? "page_1");
    const elements = ensureArray(page, "elements");
    const definition = runtime.questionTypes.get(questionTypeId);
    nextElementId = generateId(questionTypeId.replace(/-/g, "_"), collectElementIds(form));
    const draft = definition?.createDefaultQuestion(nextElementId) ?? {
      id: nextElementId,
      type: "question",
      questionType: questionTypeId,
      title: "Question",
      required: false,
    };

    const selectedElementIndex = selection.kind === "element" && selection.pageId === nextPageId
      ? elements.findIndex((item) => isRecord(item) && item.id === selection.elementId)
      : -1;
    elements.splice(selectedElementIndex >= 0 ? selectedElementIndex + 1 : elements.length, 0, { ...draft });
  });

  return { source: nextSource, pageId: nextPageId, elementId: nextElementId };
}

export function parseOptionsText(value: string): readonly QuestionOption[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawValue, ...labelParts] = line.split("|");
      const optionValue = (rawValue ?? `option_${index + 1}`).trim();
      const label = labelParts.join("|").trim() || optionValue;
      return {
        value: optionValue,
        label,
      };
    });
}

export const __designerMutationTestApi = {
  addPageSource,
  addQuestionSource,
  formatOptionsText,
  parseOptionsText,
  updateElementSource,
  updateFormMetadataSource,
  updatePageSource,
};

export function formatOptionsText(options: readonly QuestionOption[]): string {
  return options.map((option) => `${option.value} | ${option.label}`).join("\n");
}

function parseFormSource(content: string): MutableRecord {
  try {
    const parsed = YAML.parse(content);
    if (isRecord(parsed)) {
      ensureBaseForm(parsed);
      return parsed;
    }
  } catch {
    return createBaseForm();
  }
  return createBaseForm();
}

function createBaseForm(): MutableRecord {
  return {
    version: 1,
    kind: "form",
    metadata: { title: "Questionnaire" },
    pages: [],
  };
}

function ensureBaseForm(form: MutableRecord): void {
  form.version = form.version ?? 1;
  form.kind = form.kind ?? "form";
  if (!isRecord(form.metadata)) {
    form.metadata = { title: "Questionnaire" };
  }
  if (!Array.isArray(form.pages)) {
    form.pages = [];
  }
}

function resolveTargetPage(pages: unknown[], selection: FormDesignerSelection): MutableRecord {
  const selectedPageId = selection.kind === "page" || selection.kind === "element" ? selection.pageId : undefined;
  const selectedPage = pages.find((item): item is MutableRecord => isRecord(item) && item.id === selectedPageId);
  if (selectedPage) {
    return selectedPage;
  }

  const firstPage = pages.find(isRecord);
  if (firstPage) {
    return firstPage;
  }

  const fallback = { id: "page_1", title: "Page 1", elements: [] };
  pages.push(fallback);
  return fallback;
}

function findPage(form: MutableRecord, pageId: string): MutableRecord | undefined {
  const pages = Array.isArray(form.pages) ? form.pages : [];
  return pages.find((item): item is MutableRecord => isRecord(item) && item.id === pageId);
}

function findElement(form: MutableRecord, pageId: string, elementId: string): MutableRecord | undefined {
  const page = findPage(form, pageId);
  const elements = Array.isArray(page?.elements) ? page.elements : [];
  return elements.find((item): item is MutableRecord => isRecord(item) && item.id === elementId);
}

function collectPageIds(form: MutableRecord): ReadonlySet<string> {
  const pages = Array.isArray(form.pages) ? form.pages : [];
  return new Set(pages.filter(isRecord).map((page) => String(page.id ?? "")));
}

function collectElementIds(form: MutableRecord): ReadonlySet<string> {
  const pages = Array.isArray(form.pages) ? form.pages : [];
  const ids = new Set<string>();
  for (const page of pages) {
    if (!isRecord(page) || !Array.isArray(page.elements)) {
      continue;
    }
    for (const element of page.elements) {
      if (isRecord(element) && typeof element.id === "string") {
        ids.add(element.id);
      }
    }
  }
  return ids;
}

function generateId(prefix: string, existingIds: ReadonlySet<string>): string {
  const normalizedPrefix = prefix.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
  for (let index = 1; index < 1000; index += 1) {
    const id = `${normalizedPrefix}_${index}`;
    if (!existingIds.has(id)) {
      return id;
    }
  }
  return `${normalizedPrefix}_${Date.now()}`;
}

function ensureRecord(record: MutableRecord, key: string): MutableRecord {
  if (!isRecord(record[key])) {
    record[key] = {};
  }
  return record[key] as MutableRecord;
}

function ensureArray(record: MutableRecord, key: string): unknown[] {
  if (!Array.isArray(record[key])) {
    record[key] = [];
  }
  return record[key] as unknown[];
}

function applyStringPatch(record: MutableRecord, key: string, value: string | undefined): void {
  if (value === undefined) {
    return;
  }

  if (value.length === 0) {
    delete record[key];
    return;
  }

  record[key] = value;
}

function compactRecord(record: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function isRecord(value: unknown): value is MutableRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
