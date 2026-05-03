import type React from "react";
import type {
  CompiledForm,
  CompiledFormElement,
  CompiledFormPage,
} from "../../publicTypes";
import type { FormDesignerSelection } from "../types";
import {
  formatOptionsText,
  parseOptionsText,
} from "../sourceMutations";

export type FormInspectorProps = {
  readonly form: CompiledForm | null;
  readonly selection: FormDesignerSelection;
  readonly onUpdateForm: (patch: { readonly title?: string; readonly description?: string }) => void;
  readonly onUpdatePage: (pageId: string, patch: { readonly title?: string; readonly description?: string }) => void;
  readonly onUpdateElement: (
    pageId: string,
    elementId: string,
    patch: {
      readonly title?: string;
      readonly description?: string;
      readonly required?: boolean;
      readonly options?: ReturnType<typeof parseOptionsText>;
      readonly config?: Readonly<Record<string, unknown>>;
      readonly validation?: Readonly<Record<string, unknown>>;
    },
  ) => void;
};

export function FormInspector({
  form,
  selection,
  onUpdateForm,
  onUpdatePage,
  onUpdateElement,
}: FormInspectorProps): React.ReactElement {
  const page = findSelectedPage(form, selection);
  const element = findSelectedElement(page, selection);

  return (
    <section className="qf-designer-panel">
      <header>
        <h2>Inspector</h2>
      </header>
      {selection.kind === "form" && form ? (
        <FormFields
          title={form.metadata.title}
          description={form.metadata.description ?? ""}
          onChange={onUpdateForm}
        />
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
          onChange={onUpdateElement}
        />
      ) : null}
      {!form ? <p className="qf-inspector-empty">Aucune sélection éditable.</p> : null}
    </section>
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
  onChange,
}: {
  readonly pageId: string;
  readonly element: CompiledFormElement;
  readonly onChange: FormInspectorProps["onUpdateElement"];
}): React.ReactElement {
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
          <label className="qf-checkbox-field">
            <input
              type="checkbox"
              checked={element.required}
              onChange={(event) => onChange(pageId, element.id, { required: event.currentTarget.checked })}
            />
            <span>Obligatoire</span>
          </label>
          {element.options.length > 0 ? (
            <label>
              <span>Options</span>
              <textarea
                rows={5}
                value={formatOptionsText(element.options)}
                onChange={(event) =>
                  onChange(pageId, element.id, {
                    options: parseOptionsText(event.currentTarget.value),
                  })
                }
              />
            </label>
          ) : null}
          <QuestionSpecificFields pageId={pageId} element={element} onChange={onChange} />
        </>
      ) : null}
    </div>
  );
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
