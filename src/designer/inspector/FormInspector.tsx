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
        </>
      ) : null}
    </div>
  );
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
