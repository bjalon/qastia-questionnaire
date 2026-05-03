import type {
  AnswerValidationError,
  CompiledForm,
  CompiledQuestionElement,
  FormAnswers,
  FormRuntime,
} from "../publicTypes";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";

export function validateAnswers(
  form: CompiledForm,
  answers: FormAnswers,
  runtime: FormRuntime = defaultFormRuntime,
): readonly AnswerValidationError[] {
  const errors: AnswerValidationError[] = [];

  for (const page of form.pages) {
    for (const element of page.elements) {
      if (element.type !== "question") {
        continue;
      }

      const definition = runtime.questionTypes.get(element.questionType);
      const error = definition?.validateAnswer(element, answers[element.id]) ?? null;
      if (error) {
        errors.push({ questionId: element.id, pageId: page.id, message: error });
      }
    }
  }

  return errors;
}

export function getQuestionById(form: CompiledForm, questionId: string): CompiledQuestionElement | undefined {
  for (const page of form.pages) {
    for (const element of page.elements) {
      if (element.type === "question" && element.id === questionId) {
        return element;
      }
    }
  }

  return undefined;
}
