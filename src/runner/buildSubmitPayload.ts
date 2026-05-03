import type {
  CompiledForm,
  FormAnswers,
  FormRuntime,
  FormSubmitPayload,
  FormSubmitValidationResult,
} from "../publicTypes";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";
import { validateAnswers } from "./validateAnswers";

export function buildSubmitPayload(
  form: CompiledForm,
  answers: FormAnswers,
  runtime: FormRuntime = defaultFormRuntime,
  now: Date = new Date(),
): FormSubmitPayload {
  const flatAnswers: Record<string, NonNullable<FormAnswers[string]>> = {};
  const pages = form.pages.map((page) => {
    const pageAnswers: Record<string, NonNullable<FormAnswers[string]>> = {};

    for (const element of page.elements) {
      if (element.type !== "question") {
        continue;
      }

      const definition = runtime.questionTypes.get(element.questionType);
      const serialized = definition?.serializeAnswer(answers[element.id]);
      if (serialized !== undefined && serialized !== null) {
        flatAnswers[element.id] = serialized;
        pageAnswers[element.id] = serialized;
      }
    }

    return {
      id: page.id,
      title: page.title,
      answers: pageAnswers,
    };
  });

  return {
    form: {
      id: form.id,
      title: form.metadata.title,
      version: form.version,
      sourceHash: form.sourceHash,
    },
    submittedAt: now.toISOString(),
    answers: flatAnswers,
    pages,
  };
}

export function validateAndBuildSubmitPayload(
  form: CompiledForm,
  answers: FormAnswers,
  runtime: FormRuntime = defaultFormRuntime,
  now: Date = new Date(),
): FormSubmitValidationResult {
  const errors = validateAnswers(form, answers, runtime);
  if (errors.length > 0) {
    return {
      status: "invalid",
      errors,
    };
  }

  return {
    status: "valid",
    payload: buildSubmitPayload(form, answers, runtime, now),
    errors: [],
  };
}
