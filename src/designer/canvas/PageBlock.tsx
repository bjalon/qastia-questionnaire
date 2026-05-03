import type React from "react";
import type {
  CompiledFormPage,
  FormDiagnostic,
} from "../../publicTypes";
import type { FormDesignerSelection } from "../types";
import { ElementBlock } from "./ElementBlock";

export type PageBlockProps = {
  readonly page: CompiledFormPage;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly selection: FormDesignerSelection;
  readonly onSelectionChange: (selection: FormDesignerSelection) => void;
};

export function PageBlock({
  page,
  diagnostics,
  selection,
  onSelectionChange,
}: PageBlockProps): React.ReactElement {
  const selected = selection.kind === "page" && selection.pageId === page.id;
  const pageDiagnostics = diagnostics.filter((diagnostic) => diagnostic.pageId === page.id && !diagnostic.elementId);

  return (
    <article className={selected ? "qf-page-block is-selected" : "qf-page-block"}>
      <button type="button" className="qf-page-block-header" onClick={() => onSelectionChange({ kind: "page", pageId: page.id })}>
        <span>{page.id}</span>
        <strong>{page.title}</strong>
        {page.description ? <small>{page.description}</small> : null}
      </button>

      {pageDiagnostics.length > 0 ? (
        <ul className="qf-inline-diagnostics">
          {pageDiagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`}>{diagnostic.message}</li>
          ))}
        </ul>
      ) : null}

      <div className="qf-element-list">
        {page.elements.length > 0 ? (
          page.elements.map((element) => (
            <ElementBlock
              key={element.id}
              pageId={page.id}
              element={element}
              diagnostics={diagnostics}
              selected={selection.kind === "element" && selection.elementId === element.id}
              onSelectionChange={onSelectionChange}
            />
          ))
        ) : (
          <p className="qf-empty-page">Page vide</p>
        )}
      </div>
    </article>
  );
}
