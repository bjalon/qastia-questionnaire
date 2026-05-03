import type React from "react";
import type { CompiledForm, FormDiagnostic } from "../../publicTypes";
import type { FormDesignerSelection } from "../types";
import { PageBlock } from "./PageBlock";

export type DesignerCanvasProps = {
  readonly form: CompiledForm | null;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly selection: FormDesignerSelection;
  readonly onSelectionChange: (selection: FormDesignerSelection) => void;
};

export function DesignerCanvas({
  form,
  diagnostics,
  selection,
  onSelectionChange,
}: DesignerCanvasProps): React.ReactElement {
  if (!form) {
    return (
      <section className="qf-designer-canvas qf-designer-empty">
        <h2>Formulaire non compilable</h2>
        <p>Corrigez la source YAML pour retrouver le canvas visuel.</p>
      </section>
    );
  }

  return (
    <section className="qf-designer-canvas">
      <button
        type="button"
        className={selection.kind === "form" ? "qf-form-card is-selected" : "qf-form-card"}
        onClick={() => onSelectionChange({ kind: "form" })}
      >
        <span>Formulaire</span>
        <strong>{form.metadata.title}</strong>
        {form.metadata.description ? <small>{form.metadata.description}</small> : null}
      </button>
      <div className="qf-page-list">
        {form.pages.map((page) => (
          <PageBlock
            key={page.id}
            page={page}
            diagnostics={diagnostics}
            selection={selection}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </section>
  );
}
