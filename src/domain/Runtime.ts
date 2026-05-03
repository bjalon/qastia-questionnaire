import type {
  CompiledQuestionElement,
  QuestionOption,
  QuestionTypeId,
} from "./Form";
import type { FormAnswerValue, FormAnswers } from "./Answer";
import type { FormDiagnostic } from "./Diagnostic";

export type RegistryCollisionStrategy = "error" | "override" | "keep-first";

export type QuestionTypeDefinition = {
  readonly id: QuestionTypeId;
  readonly label: string;
  readonly description: string;
  readonly defaultTitle: string;
  readonly defaultConfig: Readonly<Record<string, unknown>>;
  readonly createDefaultQuestion: (id: string) => QuestionDraft;
  readonly normalizeConfig: (
    config: Readonly<Record<string, unknown>>,
  ) => Readonly<Record<string, unknown>>;
  readonly validateConfig: (question: CompiledQuestionElement) => readonly FormDiagnostic[];
  readonly validateAnswer: (question: CompiledQuestionElement, value: FormAnswerValue | undefined) => string | null;
  readonly serializeAnswer: (value: FormAnswerValue | undefined) => FormAnswerValue | undefined;
};

export type QuestionDraft = {
  readonly id: string;
  readonly type: "question";
  readonly questionType: QuestionTypeId;
  readonly title: string;
  readonly required: boolean;
  readonly options?: readonly QuestionOption[];
  readonly config?: Readonly<Record<string, unknown>>;
  readonly validation?: Readonly<Record<string, unknown>>;
};

export type ThemeDefinition = {
  readonly id: string;
  readonly label: string;
  readonly tokens: Readonly<Record<string, string>>;
};

export type ValidatorDefinition = {
  readonly id: string;
  readonly validate: (
    form: CompiledQuestionElement,
    answers: FormAnswers,
  ) => readonly FormDiagnostic[];
};

export type QuestionTypeRegistry = ReadonlyMap<QuestionTypeId, QuestionTypeDefinition>;
export type ThemeRegistry = ReadonlyMap<string, ThemeDefinition>;
export type ValidatorRegistry = ReadonlyMap<string, ValidatorDefinition>;

export type FormRuntime = {
  readonly questionTypes: QuestionTypeRegistry;
  readonly themes: ThemeRegistry;
  readonly validators: ValidatorRegistry;
};

export type CreateFormRuntimeOptions = {
  readonly questionTypes?: readonly QuestionTypeDefinition[];
  readonly themes?: readonly ThemeDefinition[];
  readonly validators?: readonly ValidatorDefinition[];
  readonly collisionStrategy?: RegistryCollisionStrategy;
};
