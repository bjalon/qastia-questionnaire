import { useEffect, useRef, useState } from "react";
import type React from "react";
import type {
  CompiledForm,
  CompiledFormElement,
  CompiledFormPage,
  FormRuntime,
  QuestionOption,
  QuestionTypeId,
} from "../../publicTypes";
import type { FormDesignerSelection } from "../types";

export type FormInspectorProps = {
  readonly form: CompiledForm | null;
  readonly runtime: FormRuntime;
  readonly selection: FormDesignerSelection;
  readonly onUpdateForm: (patch: { readonly title?: string; readonly description?: string }) => void;
  readonly onUpdateFormSettings: (patch: {
    readonly themeId?: string;
    readonly navigationMode?: "paged" | "single-page";
  }) => void;
  readonly onUpdatePage: (pageId: string, patch: { readonly title?: string; readonly description?: string }) => void;
  readonly onUpdateElement: (
    pageId: string,
    elementId: string,
    patch: {
      readonly title?: string;
      readonly description?: string;
      readonly questionType?: QuestionTypeId;
      readonly required?: boolean;
      readonly options?: readonly QuestionOption[];
      readonly config?: Readonly<Record<string, unknown>>;
      readonly validation?: Readonly<Record<string, unknown>>;
    },
  ) => void;
};

export function FormInspector({
  form,
  runtime,
  selection,
  onUpdateForm,
  onUpdateFormSettings,
  onUpdatePage,
  onUpdateElement,
}: FormInspectorProps): React.ReactElement {
  const page = findSelectedPage(form, selection);
  const element = findSelectedElement(page, selection);

  return (
    <section className="qf-designer-panel" data-qf-inspector="true">
      <header>
        <h2>Inspector</h2>
      </header>
      {selection.kind === "form" && form ? (
        <>
          <FormFields
            title={form.metadata.title}
            description={form.metadata.description ?? ""}
            onChange={onUpdateForm}
          />
          <FormSettingsFields
            themeId={form.theme.id}
            navigationMode={form.navigation}
            onChange={onUpdateFormSettings}
          />
        </>
      ) : null}
      {selection.kind === "page" && page ? (
        <FormFields
          title={page.title}
          description={page.description ?? ""}
          onChange={(patch) => onUpdatePage(page.id, patch)}
        />
      ) : null}
      {selection.kind === "element" && element ? (
        <ElementFields
          pageId={selection.pageId}
          element={element}
          runtime={runtime}
          onChange={onUpdateElement}
        />
      ) : null}
      {!form ? <p className="qf-inspector-empty">Aucune sélection éditable.</p> : null}
    </section>
  );
}

function FormSettingsFields({
  themeId,
  navigationMode,
  onChange,
}: {
  readonly themeId: string;
  readonly navigationMode: "paged" | "single-page";
  readonly onChange: (patch: { readonly themeId?: string; readonly navigationMode?: "paged" | "single-page" }) => void;
}): React.ReactElement {
  return (
    <div className="qf-inspector-fields">
      <label>
        <span>Theme</span>
        <input value={themeId} onChange={(event) => onChange({ themeId: event.currentTarget.value })} />
      </label>
      <label>
        <span>Navigation</span>
        <select value={navigationMode} onChange={(event) => onChange({ navigationMode: event.currentTarget.value as "paged" | "single-page" })}>
          <option value="paged">Pages</option>
          <option value="single-page">Page unique</option>
        </select>
      </label>
    </div>
  );
}

function FormFields({
  title,
  description,
  onChange,
}: {
  readonly title: string;
  readonly description: string;
  readonly onChange: (patch: { readonly title?: string; readonly description?: string }) => void;
}): React.ReactElement {
  return (
    <div className="qf-inspector-fields">
      <label>
        <span>Titre</span>
        <input value={title} onChange={(event) => onChange({ title: event.currentTarget.value })} />
      </label>
      <label>
        <span>Description</span>
        <textarea rows={3} value={description} onChange={(event) => onChange({ description: event.currentTarget.value })} />
      </label>
    </div>
  );
}

function ElementFields({
  pageId,
  element,
  runtime,
  onChange,
}: {
  readonly pageId: string;
  readonly element: CompiledFormElement;
  readonly runtime: FormRuntime;
  readonly onChange: FormInspectorProps["onUpdateElement"];
}): React.ReactElement {
  function changeQuestionType(questionType: QuestionTypeId): void {
    if (element.type !== "question") {
      return;
    }

    const definition = runtime.questionTypes.get(questionType);
    const draft = definition?.createDefaultQuestion(element.id);
    onChange(pageId, element.id, {
      questionType,
      options: draft?.options ?? [],
      config: draft?.config ?? definition?.defaultConfig ?? {},
      validation: draft?.validation ?? {},
    });
  }

  return (
    <div className="qf-inspector-fields">
      <label>
        <span>Titre</span>
        <input value={element.title} onChange={(event) => onChange(pageId, element.id, { title: event.currentTarget.value })} />
      </label>
      <label>
        <span>Description</span>
        <textarea
          rows={3}
          value={element.description ?? ""}
          onChange={(event) => onChange(pageId, element.id, { description: event.currentTarget.value })}
        />
      </label>
      {element.type === "question" ? (
        <>
          <label>
            <span>Type</span>
            <select
              value={element.questionType}
              onChange={(event) => changeQuestionType(event.currentTarget.value)}
            >
              {Array.from(runtime.questionTypes.values()).map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.label}
                </option>
              ))}
            </select>
          </label>
          <label className="qf-checkbox-field">
            <input
              type="checkbox"
              checked={element.required}
              onChange={(event) => onChange(pageId, element.id, { required: event.currentTarget.checked })}
            />
            <span>Obligatoire</span>
          </label>
          {usesOptions(element.questionType) ? (
            <OptionsEditor
              options={element.options}
              onChange={(options) => onChange(pageId, element.id, { options })}
            />
          ) : null}
          <QuestionSpecificFields pageId={pageId} element={element} onChange={onChange} />
        </>
      ) : null}
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  readonly options: readonly QuestionOption[];
  readonly onChange: (options: readonly QuestionOption[]) => void;
}): React.ReactElement {
  const [labels, setLabels] = useState(() => labelsFromOptions(options));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocusIndex = useRef<number | null>(null);

  useEffect(() => {
    const nextLabels = labelsFromOptions(options);
    setLabels((currentLabels) => {
      if (sameLabels(compactLabels(currentLabels), nextLabels)) {
        return currentLabels;
      }
      return nextLabels.length > 0 ? nextLabels : [""];
    });
  }, [options]);

  useEffect(() => {
    const focusIndex = pendingFocusIndex.current;
    if (focusIndex === null) {
      return;
    }
    pendingFocusIndex.current = null;
    inputRefs.current[focusIndex]?.focus();
  }, [labels]);

  function emit(nextLabels: readonly string[]): void {
    onChange(compactLabels(nextLabels).map((label) => ({ value: label, label })));
  }

  function addOption(): void {
    const nextLabels = [...labels, ""];
    setLabels(nextLabels);
    pendingFocusIndex.current = nextLabels.length - 1;
  }

  function removeOption(index: number): void {
    const nextLabels = labels.filter((_, optionIndex) => optionIndex !== index);
    const normalizedLabels = nextLabels.length > 0 ? nextLabels : [""];
    setLabels(normalizedLabels);
    emit(normalizedLabels);
  }

  function moveOption(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= labels.length) {
      return;
    }
    const nextLabels = [...labels];
    const [label] = nextLabels.splice(index, 1);
    nextLabels.splice(nextIndex, 0, label ?? "");
    setLabels(nextLabels);
    emit(nextLabels);
    pendingFocusIndex.current = nextIndex;
  }

  function updateLabel(index: number, label: string): void {
    const nextLabels = labels.map((currentLabel, optionIndex) => optionIndex === index ? label : currentLabel);
    setLabels(nextLabels);
    emit(nextLabels);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Tab" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    const nextLabels = [...labels];
    if (nextLabels[index]?.trim()) {
      nextLabels.splice(index + 1, 0, "");
      setLabels(nextLabels);
      pendingFocusIndex.current = index + 1;
    } else {
      pendingFocusIndex.current = Math.min(index + 1, nextLabels.length - 1);
    }
  }

  return (
    <div className="qf-options-editor">
      <div>
        <span>Options</span>
        <button type="button" onClick={addOption}>
          Ajouter
        </button>
      </div>
      {labels.map((label, index) => (
        <div key={index} className="qf-option-row">
          <input
            ref={(input) => {
              inputRefs.current[index] = input;
            }}
            aria-label={`Option ${index + 1}`}
            value={label}
            placeholder="Libelle de l'option"
            onChange={(event) => updateLabel(index, event.currentTarget.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
          <button type="button" title="Monter" disabled={index === 0} onClick={() => moveOption(index, -1)}>
            ↑
          </button>
          <button type="button" title="Descendre" disabled={index >= labels.length - 1} onClick={() => moveOption(index, 1)}>
            ↓
          </button>
          <button type="button" title="Supprimer" onClick={() => removeOption(index)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function labelsFromOptions(options: readonly QuestionOption[]): string[] {
  const labels = options.map((option) => option.label.trim()).filter(Boolean);
  return labels.length > 0 ? labels : [""];
}

function compactLabels(labels: readonly string[]): string[] {
  return labels.map((label) => label.trim()).filter(Boolean);
}

function sameLabels(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((label, index) => label === right[index]);
}

function usesOptions(questionType: string): boolean {
  return questionType === "single-choice" || questionType === "multiple-choice" || questionType === "dropdown";
}

function QuestionSpecificFields({
  pageId,
  element,
  onChange,
}: {
  readonly pageId: string;
  readonly element: Extract<CompiledFormElement, { readonly type: "question" }>;
  readonly onChange: FormInspectorProps["onUpdateElement"];
}): React.ReactElement | null {
  switch (element.questionType) {
    case "short-text":
    case "long-text":
      return (
        <div className="qf-inspector-grid">
          <NumberField
            label="Longueur min"
            value={numberValue(element.validation.minLength)}
            onChange={(value) => onChange(pageId, element.id, { validation: { ...element.validation, minLength: value } })}
          />
          <NumberField
            label="Longueur max"
            value={numberValue(element.validation.maxLength)}
            onChange={(value) => onChange(pageId, element.id, { validation: { ...element.validation, maxLength: value } })}
          />
        </div>
      );
    case "number":
      return (
        <>
          <div className="qf-inspector-grid">
            <NumberField
              label="Minimum"
              value={numberValue(element.validation.min)}
              onChange={(value) => onChange(pageId, element.id, { validation: { ...element.validation, min: value } })}
            />
            <NumberField
              label="Maximum"
              value={numberValue(element.validation.max)}
              onChange={(value) => onChange(pageId, element.id, { validation: { ...element.validation, max: value } })}
            />
          </div>
          <label className="qf-checkbox-field">
            <input
              type="checkbox"
              checked={element.validation.integer === true}
              onChange={(event) => onChange(pageId, element.id, { validation: { ...element.validation, integer: event.currentTarget.checked } })}
            />
            <span>Nombre entier</span>
          </label>
        </>
      );
    case "linear-scale":
      return (
        <>
          <div className="qf-inspector-grid">
            <NumberField
              label="Borne min"
              value={numberValue(element.config.min)}
              onChange={(value) => onChange(pageId, element.id, { config: { ...element.config, min: value } })}
            />
            <NumberField
              label="Borne max"
              value={numberValue(element.config.max)}
              onChange={(value) => onChange(pageId, element.id, { config: { ...element.config, max: value } })}
            />
          </div>
          <label>
            <span>Libelle min</span>
            <input value={stringValue(element.config.minLabel)} onChange={(event) => onChange(pageId, element.id, { config: { ...element.config, minLabel: event.currentTarget.value } })} />
          </label>
          <label>
            <span>Libelle max</span>
            <input value={stringValue(element.config.maxLabel)} onChange={(event) => onChange(pageId, element.id, { config: { ...element.config, maxLabel: event.currentTarget.value } })} />
          </label>
        </>
      );
    case "rating":
      return (
        <NumberField
          label="Note max"
          value={numberValue(element.config.max)}
          onChange={(value) => onChange(pageId, element.id, { config: { ...element.config, max: value } })}
        />
      );
    default:
      return null;
  }
}

function NumberField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: number | "";
  readonly onChange: (value: number | undefined) => void;
}): React.ReactElement {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value))}
      />
    </label>
  );
}

function numberValue(value: unknown): number | "" {
  return typeof value === "number" ? value : "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function findSelectedPage(
  form: CompiledForm | null,
  selection: FormDesignerSelection,
): CompiledFormPage | undefined {
  if (!form || selection.kind === "form") {
    return undefined;
  }
  return form.pages.find((page) => page.id === selection.pageId);
}

function findSelectedElement(
  page: CompiledFormPage | undefined,
  selection: FormDesignerSelection,
): CompiledFormElement | undefined {
  if (!page || selection.kind !== "element") {
    return undefined;
  }
  return page.elements.find((element) => element.id === selection.elementId);
}
