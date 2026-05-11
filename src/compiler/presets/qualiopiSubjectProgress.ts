import type { FormDiagnostic } from "../../publicTypes";
import { diagnostic } from "../diagnostics";
import { rangeForPath } from "../sourceMap/yamlRanges";

const supportedPreset = "qualiopi.subject-progress.v1";
const allowedRootFields = new Set(["version", "kind", "preset", "id", "metadata", "theme", "navigation", "qualiopi", "outputs"]);
const allowedMetadataFields = new Set(["title", "description", "locale"]);
const allowedQualiopiFields = new Set(["audience", "training", "subjects"]);
const allowedTrainingFields = new Set(["title"]);
const allowedSubjectFields = new Set(["id", "label"]);
const allowedOutputs = new Set(["hot", "cold"]);

type CompileMode = "authoring" | "strict";

type PresetExpansionResult =
  | {
      readonly expanded: Readonly<Record<string, unknown>>;
      readonly blocking: false;
    }
  | {
      readonly expanded: null;
      readonly blocking: true;
    };

type Subject = {
  readonly id: string;
  readonly label: string;
};

export function expandFormPreset(
  raw: Readonly<Record<string, unknown>>,
  source: string,
  diagnostics: FormDiagnostic[],
  mode: CompileMode,
): PresetExpansionResult {
  if (raw.kind !== "form-preset") {
    return { expanded: raw, blocking: false };
  }

  diagnostics.push(...unknownFieldDiagnostics(raw, allowedRootFields, [], source, mode));

  if (raw.version !== 1) {
    diagnostics.push(
      diagnostic("FORM_UNSUPPORTED_VERSION", "Seule la version 1 est supportee pour les presets.", {
        path: ["version"],
        range: rangeForPath(source, ["version"]),
        severity: "error",
        hint: "Mettez version: 1.",
      }),
    );
  }

  if (raw.preset !== supportedPreset) {
    diagnostics.push(
      diagnostic("FORM_INVALID_KIND", `Le preset "${typeof raw.preset === "string" ? raw.preset : "(vide)"}" est inconnu.`, {
        path: ["preset"],
        range: rangeForPath(source, ["preset"]),
        severity: "error",
        hint: `Utilisez preset: ${supportedPreset}.`,
      }),
    );
  }

  const metadata = recordOrEmpty(raw.metadata);
  diagnostics.push(...unknownFieldDiagnostics(metadata, allowedMetadataFields, ["metadata"], source, mode));

  const qualiopi = recordOrEmpty(raw.qualiopi);
  if (!isRecord(raw.qualiopi)) {
    diagnostics.push(
      diagnostic("SCHEMA_MISSING_FIELD", "Le preset Qualiopi doit definir qualiopi.subjects.", {
        path: ["qualiopi"],
        range: rangeForPath(source, ["qualiopi"]),
        severity: mode === "strict" ? "error" : "warning",
        hint: "Ajoutez qualiopi.subjects avec au moins un sujet.",
      }),
    );
  }
  diagnostics.push(...unknownFieldDiagnostics(qualiopi, allowedQualiopiFields, ["qualiopi"], source, mode));

  const training = recordOrEmpty(qualiopi.training);
  diagnostics.push(...unknownFieldDiagnostics(training, allowedTrainingFields, ["qualiopi", "training"], source, mode));

  const outputs = normalizeOutputs(raw.outputs, source, diagnostics, mode);
  const subjects = normalizeSubjects(qualiopi.subjects, source, diagnostics, mode);

  const hasBlockingErrors = diagnostics.some((item) => item.severity === "error");
  if (mode === "strict" && hasBlockingErrors) {
    return { expanded: null, blocking: true };
  }

  return {
    expanded: buildQualiopiForm(raw, metadata, training, subjects, outputs),
    blocking: false,
  };
}

function buildQualiopiForm(
  raw: Readonly<Record<string, unknown>>,
  metadata: Readonly<Record<string, unknown>>,
  training: Readonly<Record<string, unknown>>,
  subjects: readonly Subject[],
  outputs: readonly string[],
): Readonly<Record<string, unknown>> {
  const trainingTitle = stringOr(training.title, stringOr(metadata.title, "Formation"));
  return {
    version: 1,
    kind: "form",
    id: stringOr(raw.id, "qualiopi-subject-progress"),
    metadata: {
      title: stringOr(metadata.title, `Questionnaire Qualiopi - ${trainingTitle}`),
      description: stringOr(
        metadata.description,
        "Questionnaire genere a partir des sujets de formation pour le suivi Qualiopi.",
      ),
      locale: stringOr(metadata.locale, "fr-FR"),
    },
    theme: raw.theme,
    navigation: isRecord(raw.navigation) ? raw.navigation : { mode: "paged" },
    pages: [
      ...(outputs.includes("hot") ? [buildHotPage(subjects)] : []),
      ...(outputs.includes("cold") ? [buildColdPage(subjects)] : []),
    ],
  };
}

function buildHotPage(subjects: readonly Subject[]): Readonly<Record<string, unknown>> {
  return {
    id: "qualiopi_hot",
    title: "Evaluation a chaud",
    description: "Progression ressentie et satisfaction immediate.",
    elements: [
      {
        id: "hot_intro",
        type: "statement",
        title: "Votre retour a chaud",
        description: "Indiquez les sujets sur lesquels vous avez progresse pendant la formation.",
      },
      ...subjects.map((subject) => ({
        id: `hot_progress_${subject.id}`,
        type: "question",
        questionType: "linear-scale",
        title: `J'ai progresse sur : ${subject.label}`,
        required: true,
        config: {
          min: 1,
          max: 5,
          minLabel: "Pas du tout",
          maxLabel: "Tout a fait",
        },
      })),
      {
        id: "hot_useful_subjects",
        type: "question",
        questionType: "multiple-choice",
        title: "Quels sujets vous semblent les plus utiles pour votre activite ?",
        options: subjects.map((subject) => subject.label),
      },
      {
        id: "hot_global_satisfaction",
        type: "question",
        questionType: "rating",
        title: "Votre satisfaction globale",
        required: true,
        config: { max: 5 },
      },
      {
        id: "hot_difficulty_or_claim",
        type: "question",
        questionType: "long-text",
        title: "Souhaitez-vous signaler une difficulte, une reclamation ou un point bloquant ?",
        validation: { maxLength: 2000 },
      },
      {
        id: "hot_comment",
        type: "question",
        questionType: "long-text",
        title: "Autre commentaire",
        validation: { maxLength: 2000 },
      },
    ],
  };
}

function buildColdPage(subjects: readonly Subject[]): Readonly<Record<string, unknown>> {
  return {
    id: "qualiopi_cold",
    title: "Evaluation a froid",
    description: "Utilisation effective des sujets apres la formation.",
    elements: [
      {
        id: "cold_intro",
        type: "statement",
        title: "Votre retour a froid",
        description: "Indiquez les sujets que vous avez pu utiliser en situation reelle.",
      },
      ...subjects.flatMap((subject) => [
        {
          id: `cold_used_${subject.id}`,
          type: "question",
          questionType: "yes-no",
          title: `Avez-vous utilise ce sujet : ${subject.label} ?`,
          required: true,
        },
        {
          id: `cold_usefulness_${subject.id}`,
          type: "question",
          questionType: "linear-scale",
          title: `Si oui, ce sujet vous a-t-il ete utile : ${subject.label} ?`,
          config: {
            min: 1,
            max: 5,
            minLabel: "Peu utile",
            maxLabel: "Tres utile",
          },
        },
      ]),
      {
        id: "cold_usage_context",
        type: "question",
        questionType: "long-text",
        title: "Dans quelles situations avez-vous utilise les acquis ?",
        validation: { maxLength: 2000 },
      },
      {
        id: "cold_blockers",
        type: "question",
        questionType: "multiple-choice",
        title: "Qu'est-ce qui a limite l'utilisation des acquis ?",
        options: ["Pas eu l'occasion", "Manque de temps", "Contexte non adapte", "Besoin d'accompagnement", "Autre"],
      },
      {
        id: "cold_additional_need",
        type: "question",
        questionType: "yes-no",
        title: "Un complement ou un accompagnement serait-il utile ?",
      },
      {
        id: "cold_comment",
        type: "question",
        questionType: "long-text",
        title: "Autre commentaire",
        validation: { maxLength: 2000 },
      },
    ],
  };
}

function normalizeOutputs(
  value: unknown,
  source: string,
  diagnostics: FormDiagnostic[],
  mode: CompileMode,
): readonly string[] {
  if (value === undefined) {
    return ["hot", "cold"];
  }

  if (!Array.isArray(value)) {
    diagnostics.push(
      diagnostic("SCHEMA_INVALID_VALUE", "outputs doit etre une liste contenant hot et/ou cold.", {
        path: ["outputs"],
        range: rangeForPath(source, ["outputs"]),
        severity: mode === "strict" ? "error" : "warning",
      }),
    );
    return ["hot", "cold"];
  }

  const outputs = value.filter((item): item is string => typeof item === "string" && allowedOutputs.has(item));
  value.forEach((item, index) => {
    if (typeof item !== "string" || !allowedOutputs.has(item)) {
      diagnostics.push(
        diagnostic("SCHEMA_INVALID_VALUE", 'outputs accepte uniquement "hot" et "cold".', {
          path: ["outputs", String(index)],
          range: rangeForPath(source, ["outputs", String(index)]),
          severity: mode === "strict" ? "error" : "warning",
        }),
      );
    }
  });

  if (outputs.length === 0) {
    diagnostics.push(
      diagnostic("SCHEMA_INVALID_VALUE", "Le preset doit generer au moins un questionnaire.", {
        path: ["outputs"],
        range: rangeForPath(source, ["outputs"]),
        severity: mode === "strict" ? "error" : "warning",
        hint: 'Utilisez outputs: ["hot", "cold"], ["hot"] ou ["cold"].',
      }),
    );
    return ["hot", "cold"];
  }

  return Array.from(new Set(outputs));
}

function normalizeSubjects(
  value: unknown,
  source: string,
  diagnostics: FormDiagnostic[],
  mode: CompileMode,
): readonly Subject[] {
  if (!Array.isArray(value)) {
    diagnostics.push(
      diagnostic("SCHEMA_MISSING_FIELD", "Le preset Qualiopi doit definir une liste de sujets.", {
        path: ["qualiopi", "subjects"],
        range: rangeForPath(source, ["qualiopi", "subjects"]),
        severity: mode === "strict" ? "error" : "warning",
        hint: "Ajoutez au moins un sujet avec id et label.",
      }),
    );
    return [];
  }

  const subjects: Subject[] = [];
  const seenIds = new Set<string>();
  value.forEach((item, index) => {
    const path = ["qualiopi", "subjects", String(index)];
    if (!isRecord(item)) {
      diagnostics.push(
        diagnostic("SCHEMA_INVALID_VALUE", "Chaque sujet doit etre un objet.", {
          path,
          range: rangeForPath(source, path),
          severity: mode === "strict" ? "error" : "warning",
        }),
      );
      return;
    }

    diagnostics.push(...unknownFieldDiagnostics(item, allowedSubjectFields, path, source, mode));

    const label = typeof item.label === "string" ? item.label.trim() : "";
    const id = typeof item.id === "string" && item.id.trim().length > 0 ? item.id.trim() : slugify(label);

    if (label.length === 0) {
      diagnostics.push(
        diagnostic("SCHEMA_MISSING_FIELD", "Chaque sujet doit definir un label.", {
          path: [...path, "label"],
          range: rangeForPath(source, [...path, "label"]) ?? rangeForPath(source, path),
          severity: mode === "strict" ? "error" : "warning",
        }),
      );
      return;
    }

    if (!/^[a-z][a-z0-9_]*$/.test(id)) {
      diagnostics.push(
        diagnostic("SCHEMA_INVALID_VALUE", `L'id de sujet "${id}" est invalide.`, {
          path: [...path, "id"],
          range: rangeForPath(source, [...path, "id"]) ?? rangeForPath(source, path),
          severity: mode === "strict" ? "error" : "warning",
          hint: "Utilisez un id stable en minuscules avec lettres, chiffres et underscores.",
        }),
      );
      return;
    }

    if (seenIds.has(id)) {
      diagnostics.push(
        diagnostic("ELEMENT_DUPLICATE_ID", `L'id de sujet "${id}" est duplique.`, {
          path: [...path, "id"],
          range: rangeForPath(source, [...path, "id"]) ?? rangeForPath(source, path),
          severity: mode === "strict" ? "error" : "warning",
        }),
      );
      return;
    }

    seenIds.add(id);
    subjects.push({ id, label });
  });

  if (subjects.length === 0) {
    diagnostics.push(
      diagnostic("SCHEMA_MISSING_FIELD", "Le preset Qualiopi doit contenir au moins un sujet valide.", {
        path: ["qualiopi", "subjects"],
        range: rangeForPath(source, ["qualiopi", "subjects"]),
        severity: mode === "strict" ? "error" : "warning",
      }),
    );
  }

  return subjects;
}

function unknownFieldDiagnostics(
  record: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: readonly string[],
  source: string,
  mode: CompileMode,
): readonly FormDiagnostic[] {
  return Object.keys(record)
    .filter((key) => !allowed.has(key))
    .map((key) =>
      diagnostic("SCHEMA_UNKNOWN_FIELD", `Champ inconnu "${key}".`, {
        severity: mode === "strict" ? "error" : "warning",
        path: [...path, key],
        range: rangeForPath(source, [...path, key]),
        hint: "Supprimez ce champ ou ajoutez son support au preset.",
      }),
    );
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length > 0 && /^[a-z]/.test(slug) ? slug : "subject";
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function recordOrEmpty(value: unknown): Readonly<Record<string, unknown>> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
