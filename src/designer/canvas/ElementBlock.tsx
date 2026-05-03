import type React from "react";
import type {
  CompiledFormElement,
  FormDiagnostic,
} from "../../publicTypes";
import type { FormDesignerSelection } from "../types";

export type ElementBlockProps = {
  readonly pageId: string;
  readonly element: CompiledFormElement;
  readonly elementIndex: number;
  readonly elementCount: number;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly selected: boolean;
  readonly onSelectionChange: (selection: FormDesignerSelection) => void;
  readonly onDuplicateElement: (pageId: string, elementId: string) => void;
  readonly onDeleteElement: (pageId: string, elementId: string) => void;
  readonly onMoveElement: (pageId: string, elementId: string, direction: -1 | 1) => void;
};

export function ElementBlock({
  pageId,
  element,
  elementIndex,
  elementCount,
  diagnostics,
  selected,
  onSelectionChange,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
}: ElementBlockProps): React.ReactElement {
  const elementDiagnostics = diagnostics.filter((diagnostic) => diagnostic.elementId === element.id);

  return (
    <div
      role="button"
      tabIndex={0}
      className={selected ? "qf-element-block is-selected" : "qf-element-block"}
      onClick={() => onSelectionChange({ kind: "element", pageId, elementId: element.id })}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectionChange({ kind: "element", pageId, elementId: element.id });
        }
      }}
    >
      <div className="qf-element-block-main">
        <span>{element.type === "question" ? element.questionType : "statement"}</span>
        <strong>{element.title}</strong>
        {element.description ? <small>{element.description}</small> : null}
        {element.type === "question" && element.options.length > 0 ? (
          <small>{element.options.slice(0, 3).map((option) => option.label).join(" · ")}{element.options.length > 3 ? "…" : ""}</small>
        ) : null}
        {element.type === "question" && element.required ? <em>Obligatoire</em> : null}
      </div>
      <div className="qf-canvas-actions" aria-label={`Actions pour ${element.title}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" title="Monter" disabled={elementIndex === 0} onClick={() => onMoveElement(pageId, element.id, -1)}>
          ↑
        </button>
        <button type="button" title="Descendre" disabled={elementIndex >= elementCount - 1} onClick={() => onMoveElement(pageId, element.id, 1)}>
          ↓
        </button>
        <button type="button" title="Dupliquer" onClick={() => onDuplicateElement(pageId, element.id)}>
          ⧉
        </button>
        <button type="button" title="Supprimer" onClick={() => onDeleteElement(pageId, element.id)}>
          ×
        </button>
      </div>
      {elementDiagnostics.length > 0 ? (
        <ul className="qf-inline-diagnostics">
          {elementDiagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`}>{diagnostic.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
