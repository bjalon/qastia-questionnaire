import { useEffect, useState } from "react";
import type React from "react";
import type {
  CompiledFormElement,
  FormDiagnostic,
} from "../../publicTypes";
import type { FormDesignerCanvasEditMode, FormDesignerSelection } from "../types";

export type ElementBlockProps = {
  readonly pageId: string;
  readonly element: CompiledFormElement;
  readonly elementIndex: number;
  readonly elementCount: number;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly selected: boolean;
  readonly editMode: FormDesignerCanvasEditMode;
  readonly onSelectionChange: (selection: FormDesignerSelection) => void;
  readonly onUpdateElement: (
    pageId: string,
    elementId: string,
    patch: { readonly title?: string; readonly description?: string; readonly required?: boolean },
  ) => void;
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
  editMode,
  onSelectionChange,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
}: ElementBlockProps): React.ReactElement {
  const elementDiagnostics = diagnostics.filter((diagnostic) => diagnostic.elementId === element.id);
  const [draft, setDraft] = useState(() => elementDraft(element));

  useEffect(() => {
    if (!selected) {
      setDraft(elementDraft(element));
    }
  }, [element, selected]);

  function updateDraft(patch: Partial<ElementDraft>): void {
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    if (editMode === "instant") {
      onUpdateElement(pageId, element.id, draftPatch(element, nextDraft));
    }
  }

  function saveDraft(): void {
    onUpdateElement(pageId, element.id, draftPatch(element, draft));
  }

  function cancelDraft(): void {
    setDraft(elementDraft(element));
  }

  function blurBlock(event: React.FocusEvent<HTMLDivElement>): void {
    if (editMode === "instant" && !event.currentTarget.contains(event.relatedTarget)) {
      saveDraft();
    }
  }

  return (
    <div
      role={selected ? undefined : "button"}
      tabIndex={selected ? undefined : 0}
      className={selected ? "qf-element-block is-selected" : "qf-element-block"}
      data-edit-mode={selected ? editMode : "readonly"}
      onClick={() => onSelectionChange({ kind: "element", pageId, elementId: element.id })}
      onBlur={blurBlock}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectionChange({ kind: "element", pageId, elementId: element.id });
        }
      }}
    >
      {selected ? (
        <div className="qf-element-block-main qf-element-editor" onClick={(event) => event.stopPropagation()}>
          <input
            aria-label="Titre de la question"
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.currentTarget.value })}
          />
          <textarea
            aria-label="Description de la question"
            rows={2}
            value={draft.description}
            placeholder="Description"
            onChange={(event) => updateDraft({ description: event.currentTarget.value })}
          />
          {element.type === "question" ? (
            <label className="qf-element-required">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(event) => updateDraft({ required: event.currentTarget.checked })}
              />
              <span>Obligatoire</span>
            </label>
          ) : null}
          {editMode === "commit" ? (
            <div className="qf-element-edit-actions">
              <button type="button" onClick={saveDraft}>
                Enregistrer
              </button>
              <button type="button" onClick={cancelDraft}>
                Annuler
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="qf-element-block-main">
          <strong>{element.title}</strong>
          {element.description ? <small>{element.description}</small> : null}
          {element.type === "question" && element.options.length > 0 ? (
            <small>{element.options.slice(0, 3).map((option) => option.label).join(" · ")}{element.options.length > 3 ? "…" : ""}</small>
          ) : null}
          <div className="qf-element-meta">
            <span className="qf-question-type-pill">{element.type === "question" ? element.questionType : "statement"}</span>
            {element.type === "question" && element.required ? <span className="qf-required-pill">Obligatoire</span> : null}
          </div>
        </div>
      )}
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

type ElementDraft = {
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
};

function elementDraft(element: CompiledFormElement): ElementDraft {
  return {
    title: element.title,
    description: element.description ?? "",
    required: element.type === "question" ? element.required : false,
  };
}

function draftPatch(
  element: CompiledFormElement,
  draft: ElementDraft,
): { readonly title?: string; readonly description?: string; readonly required?: boolean } {
  return {
    title: draft.title,
    description: draft.description,
    required: element.type === "question" ? draft.required : undefined,
  };
}
