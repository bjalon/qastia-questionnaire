import type {
  CompiledQuestionElement,
  FormAnswerValue,
  FormDiagnostic,
  QuestionOption,
  QuestionTypeDefinition,
} from "../publicTypes";

export const defaultQuestionTypes: readonly QuestionTypeDefinition[] = [
  createTextQuestionType("short-text", "Texte court", "Reponse courte", false),
  createTextQuestionType("long-text", "Texte long", "Reponse longue", true),
  createYesNoQuestionType(),
  createOptionsQuestionType("single-choice", "Choix unique", "Selectionnez une option", false),
  createOptionsQuestionType("multiple-choice", "Choix multiple", "Selectionnez une ou plusieurs options", true),
  createOptionsQuestionType("dropdown", "Liste deroulante", "Selectionnez une option", false),
  createNumberQuestionType(),
  createDateQuestionType(),
  createLinearScaleQuestionType(),
  createRatingQuestionType(),
  createStatementQuestionType(),
];

function createTextQuestionType(
  id: "short-text" | "long-text",
  label: string,
  defaultTitle: string,
  multiline: boolean,
): QuestionTypeDefinition {
  return {
    id,
    label,
    description: multiline ? "Champ texte multiligne." : "Champ texte court.",
    defaultTitle,
    defaultConfig: {},
    createDefaultQuestion: (questionId) => ({
      id: questionId,
      type: "question",
      questionType: id,
      title: defaultTitle,
      required: false,
    }),
    normalizeConfig: (config) => config,
    validateConfig: (question) => validateLengthRules(question),
    validateAnswer: (question, value) => {
      if (value === undefined || value === null || value === "") {
        return question.required ? "Cette question est obligatoire." : null;
      }

      if (typeof value !== "string") {
        return "La reponse doit etre un texte.";
      }

      const minLength = numberFromRecord(question.validation, "minLength");
      const maxLength = numberFromRecord(question.validation, "maxLength");
      if (minLength !== undefined && value.length < minLength) {
        return `La reponse doit contenir au moins ${minLength} caracteres.`;
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return `La reponse doit contenir au maximum ${maxLength} caracteres.`;
      }

      return null;
    },
    serializeAnswer: (value) => (typeof value === "string" && value.length > 0 ? value : undefined),
  };
}

function createYesNoQuestionType(): QuestionTypeDefinition {
  return {
    id: "yes-no",
    label: "Oui / non",
    description: "Question binaire.",
    defaultTitle: "Votre reponse",
    defaultConfig: {},
    createDefaultQuestion: (id) => ({
      id,
      type: "question",
      questionType: "yes-no",
      title: "Votre reponse",
      required: false,
    }),
    normalizeConfig: (config) => config,
    validateConfig: () => [],
    validateAnswer: (question, value) => {
      if (value === undefined || value === null) {
        return question.required ? "Cette question est obligatoire." : null;
      }

      return typeof value === "boolean" ? null : "La reponse doit etre oui ou non.";
    },
    serializeAnswer: (value) => (typeof value === "boolean" ? value : undefined),
  };
}

function createOptionsQuestionType(
  id: "single-choice" | "multiple-choice" | "dropdown",
  label: string,
  defaultTitle: string,
  multiple: boolean,
): QuestionTypeDefinition {
  return {
    id,
    label,
    description: multiple ? "Selection de plusieurs options." : "Selection d'une option.",
    defaultTitle,
    defaultConfig: {},
    createDefaultQuestion: (questionId) => ({
      id: questionId,
      type: "question",
      questionType: id,
      title: defaultTitle,
      required: false,
      options: [
        { value: "Option 1", label: "Option 1" },
        { value: "Option 2", label: "Option 2" },
      ],
    }),
    normalizeConfig: (config) => config,
    validateConfig: (question) => validateOptions(question),
    validateAnswer: (question, value) => validateOptionAnswer(question, value, multiple),
    serializeAnswer: (value) => {
      if (multiple && Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string");
      }

      return typeof value === "string" && value.length > 0 ? value : undefined;
    },
  };
}

function createNumberQuestionType(): QuestionTypeDefinition {
  return {
    id: "number",
    label: "Nombre",
    description: "Champ numerique.",
    defaultTitle: "Nombre",
    defaultConfig: {},
    createDefaultQuestion: (id) => ({
      id,
      type: "question",
      questionType: "number",
      title: "Nombre",
      required: false,
    }),
    normalizeConfig: (config) => config,
    validateConfig: (question) => {
      const min = numberFromRecord(question.validation, "min");
      const max = numberFromRecord(question.validation, "max");
      if (min !== undefined && max !== undefined && min > max) {
        return [questionDiagnostic(question, "QUESTION_INVALID_CONFIG", "La valeur minimale doit etre inferieure a la valeur maximale.")];
      }
      return [];
    },
    validateAnswer: (question, value) => {
      if (value === undefined || value === null || value === "") {
        return question.required ? "Cette question est obligatoire." : null;
      }
      if (typeof value !== "number" || Number.isNaN(value)) {
        return "La reponse doit etre un nombre.";
      }

      const min = numberFromRecord(question.validation, "min");
      const max = numberFromRecord(question.validation, "max");
      const integer = question.validation.integer === true;
      if (integer && !Number.isInteger(value)) {
        return "La reponse doit etre un nombre entier.";
      }
      if (min !== undefined && value < min) {
        return `La reponse doit etre superieure ou egale a ${min}.`;
      }
      if (max !== undefined && value > max) {
        return `La reponse doit etre inferieure ou egale a ${max}.`;
      }
      return null;
    },
    serializeAnswer: (value) => (typeof value === "number" && !Number.isNaN(value) ? value : undefined),
  };
}

function createDateQuestionType(): QuestionTypeDefinition {
  return {
    id: "date",
    label: "Date",
    description: "Champ date ISO.",
    defaultTitle: "Date",
    defaultConfig: {},
    createDefaultQuestion: (id) => ({
      id,
      type: "question",
      questionType: "date",
      title: "Date",
      required: false,
    }),
    normalizeConfig: (config) => config,
    validateConfig: () => [],
    validateAnswer: (question, value) => {
      if (value === undefined || value === null || value === "") {
        return question.required ? "Cette question est obligatoire." : null;
      }
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? null
        : "La reponse doit etre une date au format AAAA-MM-JJ.";
    },
    serializeAnswer: (value) => (typeof value === "string" && value.length > 0 ? value : undefined),
  };
}

function createLinearScaleQuestionType(): QuestionTypeDefinition {
  return {
    id: "linear-scale",
    label: "Echelle lineaire",
    description: "Note numerique entre deux bornes.",
    defaultTitle: "Votre evaluation",
    defaultConfig: { min: 1, max: 5 },
    createDefaultQuestion: (id) => ({
      id,
      type: "question",
      questionType: "linear-scale",
      title: "Votre evaluation",
      required: false,
      config: { min: 1, max: 5 },
    }),
    normalizeConfig: (config) => ({
      min: numberFromRecord(config, "min") ?? 1,
      max: numberFromRecord(config, "max") ?? 5,
      minLabel: stringFromRecord(config, "minLabel"),
      maxLabel: stringFromRecord(config, "maxLabel"),
    }),
    validateConfig: (question) => validateScaleConfig(question),
    validateAnswer: (question, value) => validateNumberInConfigRange(question, value),
    serializeAnswer: (value) => (typeof value === "number" ? value : undefined),
  };
}

function createRatingQuestionType(): QuestionTypeDefinition {
  return {
    id: "rating",
    label: "Note",
    description: "Note de type etoiles.",
    defaultTitle: "Votre note",
    defaultConfig: { max: 5 },
    createDefaultQuestion: (id) => ({
      id,
      type: "question",
      questionType: "rating",
      title: "Votre note",
      required: false,
      config: { max: 5 },
    }),
    normalizeConfig: (config) => ({
      max: numberFromRecord(config, "max") ?? 5,
    }),
    validateConfig: (question) => {
      const max = numberFromRecord(question.config, "max") ?? 5;
      return max < 2 || max > 10
        ? [questionDiagnostic(question, "QUESTION_INVALID_CONFIG", "La note maximale doit etre comprise entre 2 et 10.")]
        : [];
    },
    validateAnswer: (question, value) => validateNumberInConfigRange(question, value, 1),
    serializeAnswer: (value) => (typeof value === "number" ? value : undefined),
  };
}

function createStatementQuestionType(): QuestionTypeDefinition {
  return {
    id: "statement",
    label: "Texte informatif",
    description: "Bloc sans reponse attendue.",
    defaultTitle: "Information",
    defaultConfig: {},
    createDefaultQuestion: (id) => ({
      id,
      type: "question",
      questionType: "statement",
      title: "Information",
      required: false,
    }),
    normalizeConfig: (config) => config,
    validateConfig: () => [],
    validateAnswer: () => null,
    serializeAnswer: () => undefined,
  };
}

function validateLengthRules(question: CompiledQuestionElement): readonly FormDiagnostic[] {
  const minLength = numberFromRecord(question.validation, "minLength");
  const maxLength = numberFromRecord(question.validation, "maxLength");
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    return [questionDiagnostic(question, "QUESTION_INVALID_CONFIG", "La longueur minimale doit etre inferieure a la longueur maximale.")];
  }
  return [];
}

function validateOptions(question: CompiledQuestionElement): readonly FormDiagnostic[] {
  const diagnostics: FormDiagnostic[] = [];
  const values = new Set<string>();

  if (question.options.length === 0) {
    diagnostics.push(questionDiagnostic(question, "QUESTION_INVALID_OPTIONS", "La question doit proposer au moins une option."));
  }

  for (const option of question.options) {
    if (option.value.trim().length === 0 || option.label.trim().length === 0) {
      diagnostics.push(questionDiagnostic(question, "QUESTION_INVALID_OPTIONS", "Les options doivent avoir une valeur et un libelle."));
    }

    if (values.has(option.value)) {
      diagnostics.push(questionDiagnostic(question, "QUESTION_INVALID_OPTIONS", `L'option "${option.value}" est dupliquee.`));
    }
    values.add(option.value);
  }

  return diagnostics;
}

function validateOptionAnswer(
  question: CompiledQuestionElement,
  value: FormAnswerValue | undefined,
  multiple: boolean,
): string | null {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return question.required ? "Cette question est obligatoire." : null;
  }

  const allowedValues = new Set(question.options.map((option) => option.value));
  if (multiple) {
    if (!Array.isArray(value)) {
      return "La reponse doit etre une liste d'options.";
    }
    return value.every((item) => typeof item === "string" && allowedValues.has(item))
      ? null
      : "La reponse contient une option inconnue.";
  }

  return typeof value === "string" && allowedValues.has(value)
    ? null
    : "La reponse doit correspondre a une option.";
}

function validateScaleConfig(question: CompiledQuestionElement): readonly FormDiagnostic[] {
  const min = numberFromRecord(question.config, "min") ?? 1;
  const max = numberFromRecord(question.config, "max") ?? 5;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
    return [questionDiagnostic(question, "QUESTION_INVALID_CONFIG", "L'echelle doit definir deux bornes entieres avec min < max.")];
  }
  return [];
}

function validateNumberInConfigRange(
  question: CompiledQuestionElement,
  value: FormAnswerValue | undefined,
  fallbackMin?: number,
): string | null {
  if (value === undefined || value === null) {
    return question.required ? "Cette question est obligatoire." : null;
  }
  if (typeof value !== "number") {
    return "La reponse doit etre un nombre.";
  }
  const min = numberFromRecord(question.config, "min") ?? fallbackMin ?? 1;
  const max = numberFromRecord(question.config, "max") ?? 5;
  return value >= min && value <= max ? null : `La reponse doit etre comprise entre ${min} et ${max}.`;
}

function questionDiagnostic(
  question: CompiledQuestionElement,
  code: FormDiagnostic["code"],
  message: string,
): FormDiagnostic {
  return {
    code,
    severity: "error",
    message,
    elementId: question.id,
    path: ["pages", question.id],
  };
}

function numberFromRecord(record: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringFromRecord(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function normalizeOptions(value: unknown): readonly QuestionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((option, index) => {
      if (typeof option === "string") {
        const label = option.trim();
        return label.length > 0 ? { value: label, label } : null;
      }
      if (!isRecord(option)) {
        return null;
      }
      const value = typeof option.value === "string" ? option.value : `option_${index + 1}`;
      const label = typeof option.label === "string" ? option.label : value;
      return { value, label };
    })
    .filter((option): option is QuestionOption => option !== null);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
