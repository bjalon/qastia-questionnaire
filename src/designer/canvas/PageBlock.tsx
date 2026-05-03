import type React from "react";
import type {
  CompiledFormPage,
  FormDiagnostic,
} from "../../publicTypes";
import type { FormDesignerSelection } from "../types";
import { ElementBlock } from "./ElementBlock";

export type PageBlockProps = {
  readonly page: CompiledFormPage;
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly selection: FormDesignerSelection;
  readonly onSelectionChange: (selection: FormDesignerSelection) => void;
  readonly onDuplicatePage: (pageId: string) => void;
  readonly onDeletePage: (pageId: string) => void;
  readonly onMovePage: (pageId: string, direction: -1 | 1) => void;
  readonly onDuplicateElement: (pageId: string, elementId: string) => void;
  readonly onDeleteElement: (pageId: string, elementId: string) => void;
  readonly onMoveElement: (pageId: string, elementId: string, direction: -1 | 1) => void;
};

export function PageBlock({
  page,
  pageIndex,
  pageCount,
  diagnostics,
  selection,
  onSelectionChange,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
}: PageBlockProps): React.ReactElement {
  const selected = selection.kind === "page" && selection.pageId === page.id;
  const pageDiagnostics = diagnostics.filter((diagnostic) => diagnostic.pageId === page.id && !diagnostic.elementId);

  return (
    <article className={selected ? "qf-page-block is-selected" : "qf-page-block"}>
      <div className="qf-page-block-header">
        <button type="button" onClick={() => onSelectionChange({ kind: "page", pageId: page.id })}>
          <span>{page.id}</span>
          <strong>{page.title}</strong>
          {page.description ? <small>{page.description}</small> : null}
        </button>
        <div className="qf-canvas-actions" aria-label={`Actions pour ${page.title}`}>
          <button type="button" title="Monter la page" disabled={pageIndex === 0} onClick={() => onMovePage(page.id, -1)}>
            ↑
          </button>
          <button type="button" title="Descendre la page" disabled={pageIndex >= pageCount - 1} onClick={() => onMovePage(page.id, 1)}>
            ↓
          </button>
          <button type="button" title="Dupliquer la page" onClick={() => onDuplicatePage(page.id)}>
            ⧉
          </button>
          <button type="button" title="Supprimer la page" onClick={() => onDeletePage(page.id)}>
            ×
          </button>
        </div>
      </div>

      {pageDiagnostics.length > 0 ? (
        <ul className="qf-inline-diagnostics">
          {pageDiagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`}>{diagnostic.message}</li>
          ))}
        </ul>
      ) : null}

      <div className="qf-element-list">
        {page.elements.length > 0 ? (
          page.elements.map((element, elementIndex) => (
            <ElementBlock
              key={element.id}
              pageId={page.id}
              element={element}
              elementIndex={elementIndex}
              elementCount={page.elements.length}
              diagnostics={diagnostics}
              selected={selection.kind === "element" && selection.elementId === element.id}
              onSelectionChange={onSelectionChange}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onMoveElement={onMoveElement}
            />
          ))
        ) : (
          <p className="qf-empty-page">Page vide</p>
        )}
      </div>
    </article>
  );
}
