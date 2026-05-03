import type { CompiledForm } from "./Form";

export type FormAnswerValue = string | number | boolean | readonly string[] | null;

export type FormAnswers = Readonly<Record<string, FormAnswerValue>>;

export type FormSubmitPagePayload = {
  readonly id: string;
  readonly title: string;
  readonly answers: FormAnswers;
};

export type FormSubmitPayload = {
  readonly form: {
    readonly id: string;
    readonly title: string;
    readonly version: 1;
    readonly sourceHash: string;
  };
  readonly submittedAt: string;
  readonly answers: FormAnswers;
  readonly pages: readonly FormSubmitPagePayload[];
};

export type FormSubmitEvent = {
  readonly form: CompiledForm;
  readonly payload: FormSubmitPayload;
};

export type AnswerValidationError = {
  readonly questionId: string;
  readonly pageId?: string;
  readonly message: string;
};

export type FormSubmitValidationResult =
  | {
      readonly status: "valid";
      readonly payload: FormSubmitPayload;
      readonly errors: readonly [];
    }
  | {
      readonly status: "invalid";
      readonly errors: readonly AnswerValidationError[];
    };
