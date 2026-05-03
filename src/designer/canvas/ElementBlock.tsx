import type React from "react";
import type {
  CompiledFormElement,
  FormDiagnostic,
} from "../../publicTypes";
import type { FormDesignerSelection } from "../types";

export type ElementBlockProps = {
  readonly pageId: string;
  readonly element: CompiledFormElement;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly selected: boolean;
  readonly onSelectionChange: (selection: FormDesignerSelection) => void;
};

export function ElementBlock({
  pageId,
  element,
  diagnostics,
  selected,
  onSelectionChange,
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
      <span>{element.type === "question" ? element.questionType : "statement"}</span>
      <strong>{element.title}</strong>
      {element.description ? <small>{element.description}</small> : null}
      {element.type === "question" && element.required ? <em>Obligatoire</em> : null}
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
