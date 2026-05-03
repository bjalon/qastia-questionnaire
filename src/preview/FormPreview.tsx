import { useState } from "react";
import type React from "react";
import type {
  CompileFormResult,
  FormAnswers,
  FormRuntime,
  FormSubmitPayload,
} from "../publicTypes";
import { DebugFormFallback } from "../debug/DebugFormFallback";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";
import { FormRunner } from "../runner/FormRunner";

export type FormPreviewProps = {
  readonly result: CompileFormResult;
  readonly runtime?: FormRuntime;
  readonly showDiagnostics?: boolean;
  readonly showHeader?: boolean;
  readonly showHeaderTitle?: boolean;
};

export function FormPreview({
  result,
  runtime = defaultFormRuntime,
  showDiagnostics = true,
  showHeader = true,
  showHeaderTitle = true,
}: FormPreviewProps): React.ReactElement {
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [submittedPayload, setSubmittedPayload] = useState<FormSubmitPayload | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const form = result.status === "valid" || result.status === "degraded" ? result.form : null;

  function reset(): void {
    setAnswers({});
    setSubmittedPayload(null);
    setResetVersion((current) => current + 1);
  }

  return (
    <section className="qf-preview">
      {showHeader ? (
        <header className="qf-preview-toolbar">
          <div>
            <p>Preview participant</p>
            {showHeaderTitle ? <h2>{form?.metadata.title ?? "Formulaire invalide"}</h2> : null}
          </div>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </header>
      ) : null}

      {showDiagnostics && result.diagnostics.length > 0 ? (
        <DiagnosticsList diagnostics={result.diagnostics} />
      ) : null}

      <div className="qf-preview-body">
        <div>
          {form ? (
            <FormRunner
              key={`${form.sourceHash}-${resetVersion}`}
              form={form}
              runtime={runtime}
              answers={answers}
              viewMode="preview"
              onAnswersChange={setAnswers}
              onSubmit={(event) => setSubmittedPayload(event.payload)}
            />
          ) : result.status === "invalid" ? (
            <DebugFormFallback fallback={result.fallback} diagnostics={result.diagnostics} />
          ) : null}
        </div>
        <aside className="qf-preview-json">
          <h3>JSON</h3>
          <pre>{JSON.stringify(submittedPayload ?? { answers }, null, 2)}</pre>
        </aside>
      </div>
    </section>
  );
}

function DiagnosticsList({
  diagnostics,
}: {
  readonly diagnostics: CompileFormResult["diagnostics"];
}): React.ReactElement {
  return (
    <ul className="qf-designer-diagnostics">
      {diagnostics.map((diagnostic, index) => (
        <li key={`${diagnostic.code}-${index}`} data-severity={diagnostic.severity}>
          <strong>{diagnostic.code}</strong>
          <span>{diagnostic.message}</span>
        </li>
      ))}
    </ul>
  );
}
