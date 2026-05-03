import type React from "react";
import { useMemo, useState } from "react";
import type {
  AnswerValidationError,
  CompiledForm,
  FormAnswers,
  FormAnswerValue,
  FormRuntime,
  FormSubmitEvent,
} from "../publicTypes";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";
import { validateAndBuildSubmitPayload } from "./buildSubmitPayload";
import { FormNavigation } from "./FormNavigation";
import { FormPageRenderer } from "./FormPageRenderer";
import { FormProgress } from "./FormProgress";
import { validateAnswers } from "./validateAnswers";

export type FormRunnerViewMode = "participant" | "preview";
export type FormRunnerSubmitState = "idle" | "submitted";

export type FormRunnerProps = {
  readonly form: CompiledForm;
  readonly runtime?: FormRuntime;
  readonly answers?: FormAnswers;
  readonly defaultAnswers?: FormAnswers;
  readonly viewMode?: FormRunnerViewMode;
  readonly onAnswersChange?: (answers: FormAnswers) => void;
  readonly onSubmit?: (event: FormSubmitEvent) => void;
};

export function FormRunner({
  form,
  runtime = defaultFormRuntime,
  answers,
  defaultAnswers = {},
  viewMode = "participant",
  onAnswersChange,
  onSubmit,
}: FormRunnerProps): React.ReactElement {
  const [internalAnswers, setInternalAnswers] = useState<FormAnswers>(defaultAnswers);
  const [pageIndex, setPageIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<readonly AnswerValidationError[]>([]);
  const [submitState, setSubmitState] = useState<FormRunnerSubmitState>("idle");
  const currentAnswers = answers ?? internalAnswers;
  const currentPage = form.navigation === "single-page" ? undefined : form.pages[pageIndex];
  const renderedPages = form.navigation === "single-page" ? form.pages : currentPage ? [currentPage] : [];
  const pageCount = form.navigation === "single-page" ? 1 : Math.max(form.pages.length, 1);
  const errorsByQuestionId = useMemo(
    () => new Map(validationErrors.map((error) => [error.questionId, error.message])),
    [validationErrors],
  );

  function updateAnswer(questionId: string, value: FormAnswerValue | undefined): void {
    const nextAnswers = { ...currentAnswers };
    if (value === undefined || value === null || value === "") {
      delete nextAnswers[questionId];
    } else {
      nextAnswers[questionId] = value;
    }
    setInternalAnswers(nextAnswers);
    onAnswersChange?.(nextAnswers);
    setValidationErrors((current) => current.filter((error) => error.questionId !== questionId));
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = validateAndBuildSubmitPayload(form, currentAnswers, runtime);
    if (result.status === "invalid") {
      setValidationErrors(result.errors);
      focusFirstError(result.errors[0]?.questionId);
      return;
    }

    setValidationErrors([]);
    setSubmitState("submitted");
    onSubmit?.({ form, payload: result.payload });
  }

  return (
    <form className="qf-runner" data-view-mode={viewMode} onSubmit={submit}>
      <header className="qf-form-header">
        <p>{form.metadata.locale ?? "fr-FR"}</p>
        <h1>{form.metadata.title}</h1>
        {form.metadata.description ? <div>{form.metadata.description}</div> : null}
      </header>

      {form.navigation === "paged" ? <FormProgress pageIndex={pageIndex} pageCount={pageCount} /> : null}

      {renderedPages.map((page) => (
        <FormPageRenderer
          key={page.id}
          page={page}
          answers={currentAnswers}
          errors={errorsByQuestionId}
          onChange={updateAnswer}
        />
      ))}

      {form.navigation === "paged" ? (
        <FormNavigation
          pageIndex={pageIndex}
          pageCount={pageCount}
          canSubmit={form.pages.length > 0}
          onPrevious={() => setPageIndex((current) => Math.max(0, current - 1))}
          onNext={() => setPageIndex((current) => Math.min(form.pages.length - 1, current + 1))}
        />
      ) : (
        <footer className="qf-navigation">
          <button type="submit" className="qf-primary" disabled={form.pages.length === 0}>
            Envoyer
          </button>
        </footer>
      )}

      {submitState === "submitted" ? <p className="qf-submit-state">Reponse envoyee.</p> : null}
    </form>
  );
}

function focusFirstError(questionId: string | undefined): void {
  if (!questionId || typeof document === "undefined") {
    return;
  }

  const element = document.querySelector<HTMLElement>(`[data-question-type] [name="${questionId}"], #${questionId}-error`);
  element?.focus();
}
