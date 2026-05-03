import { useRef } from "react";
import type React from "react";
import type { FormDiagnostic, FormSource } from "../../publicTypes";

export type FormYamlEditorProps = {
  readonly source: FormSource;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly onSourceChange: (source: FormSource) => void;
};

export function FormYamlEditor({
  source,
  diagnostics,
  onSourceChange,
}: FormYamlEditorProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function focusDiagnostic(diagnostic: FormDiagnostic): void {
    if (!diagnostic.range || !textareaRef.current) {
      return;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(diagnostic.range.start.offset, diagnostic.range.end.offset);
  }

  return (
    <section className="qf-yaml-mode">
      <textarea
        ref={textareaRef}
        className="qf-yaml-editor"
        spellCheck={false}
        value={source.content}
        onChange={(event) => onSourceChange({ ...source, content: event.currentTarget.value })}
      />
      <aside className="qf-yaml-diagnostics">
        <h2>Diagnostics</h2>
        {diagnostics.length === 0 ? (
          <p>Aucun diagnostic.</p>
        ) : (
          <ul>
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`}>
                <button type="button" onClick={() => focusDiagnostic(diagnostic)}>
                  <strong>{diagnostic.code}</strong>
                  <span>{diagnostic.message}</span>
                  {diagnostic.range ? (
                    <small>
                      ligne {diagnostic.range.start.line}, colonne {diagnostic.range.start.column}
                    </small>
                  ) : diagnostic.path ? (
                    <small>{diagnostic.path.join(".")}</small>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  );
}
