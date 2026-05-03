import type React from "react";
import type { DebugFormViewModel, FormDiagnostic } from "../publicTypes";

export type DebugFormFallbackProps = {
  readonly fallback: DebugFormViewModel;
  readonly diagnostics: readonly FormDiagnostic[];
};

export function DebugFormFallback({
  fallback,
  diagnostics,
}: DebugFormFallbackProps): React.ReactElement {
  return (
    <section className="qf-debug">
      <header>
        <p>Compilation impossible</p>
        <h2>{fallback.title}</h2>
      </header>
      <ul>
        {diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}-${index}`}>
            <strong>{diagnostic.code}</strong>
            <span>{diagnostic.message}</span>
          </li>
        ))}
      </ul>
      <pre>{fallback.source.content}</pre>
    </section>
  );
}
