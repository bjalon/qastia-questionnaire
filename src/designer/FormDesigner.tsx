import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { compileForm } from "../compiler/compileForm";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";
import { FormPreview } from "../preview/FormPreview";
import type {
  CompileFormResult,
  CompiledForm,
  FormDiagnostic,
  FormDesignerPersistenceAdapter,
  FormSource,
} from "../publicTypes";
import { FORM_RUNTIME_PUBLIC_API_VERSION } from "../domain/PublicApi";
import { DesignerCanvas } from "./canvas/DesignerCanvas";
import { defaultDesignerOptions } from "./defaultDesignerOptions";
import { FormInspector } from "./inspector/FormInspector";
import { QuestionPalette } from "./palette/QuestionPalette";
import { FormYamlEditor } from "./sourceMode/FormYamlEditor";
import { VersionHistoryPanel } from "./versions/VersionHistoryPanel";
import {
  addPageSource,
  addQuestionSource,
  deleteElementSource,
  deletePageSource,
  duplicateElementSource,
  duplicatePageSource,
  moveElementSource,
  movePageSource,
  updateElementSource,
  updateFormMetadataSource,
  updateFormSettingsSource,
  updatePageSource,
} from "./sourceMutations";
import type {
  FormDesignerProps,
  FormDesignerSelection,
  FormDesignerViewMode,
  FormSourceChangeReason,
} from "./types";

const emptySource: FormSource = {
  uri: "local://form-designer.yml",
  content: `version: 1
kind: form
metadata:
  title: "Questionnaire"
pages:
  - id: page_1
    title: "Page 1"
    elements: []
`,
};

export function FormDesigner({
  source,
  defaultSource = emptySource,
  runtime = defaultFormRuntime,
  actions,
  storage = false,
  storageKey,
  selection,
  defaultSelection = { kind: "form" },
  options,
  onSourceChange,
  onSelectionChange,
  onCompile,
}: FormDesignerProps): React.ReactElement {
  const [internalSource, setInternalSource] = useState<FormSource>(defaultSource);
  const resolvedOptions = { ...defaultDesignerOptions, ...options };
  const [viewMode, setViewMode] = useState<FormDesignerViewMode>(resolvedOptions.defaultViewMode);
  const [internalSelection, setInternalSelection] = useState<FormDesignerSelection>(defaultSelection);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [openModeMenu, setOpenModeMenu] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(source !== undefined || storage === false);
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null);
  const lastValidVersionHash = useRef<string | null>(null);
  const currentSource = source ?? internalSource;
  const currentSelection = selection ?? internalSelection;
  const compileResult = useMemo(
    () => compileForm(currentSource, runtime, { mode: "authoring" }),
    [currentSource, runtime],
  );
  const form = getCompiledForm(compileResult);

  useEffect(() => {
    onCompile?.(compileResult);
  }, [compileResult, onCompile]);

  useEffect(() => {
    if (!storage || !resolvedOptions.autoSaveValidVersions || compileResult.status !== "valid") {
      return;
    }

    const hash = compileResult.form.sourceHash;
    if (lastValidVersionHash.current === hash) {
      return;
    }
    lastValidVersionHash.current = hash;

    void storage.saveVersion({
      id: `valid-${hash.replace(/[^a-z0-9]+/gi, "-")}`,
      key: resolvedStorageKey(storageKey, currentSource, compileResult.form),
      source: currentSource,
      createdAt: new Date().toISOString(),
      label: "Derniere version valide",
      apiVersion: FORM_RUNTIME_PUBLIC_API_VERSION,
    });
  }, [compileResult, currentSource, resolvedOptions.autoSaveValidVersions, storage, storageKey]);

  useEffect(() => {
    if (!resolvedOptions.viewModes.includes(viewMode)) {
      setViewMode(resolvedOptions.viewModes[0] ?? "form");
    }
  }, [resolvedOptions.viewModes, viewMode]);

  useEffect(() => {
    if (source || !storage || storageLoaded) {
      return;
    }

    let cancelled = false;
    void storage.loadDraft(resolvedStorageKey(storageKey, currentSource, form)).then((snapshot) => {
      if (cancelled) {
        return;
      }
      if (snapshot) {
        setInternalSource(snapshot.source);
        setRecoveredAt(snapshot.updatedAt);
      }
      setStorageLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [currentSource, form, source, storage, storageKey, storageLoaded]);

  useEffect(() => {
    if (!openModeMenu) {
      return;
    }

    function closeMenu(): void {
      setOpenModeMenu(false);
    }

    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openModeMenu]);

  function applySource(nextSource: FormSource, reason: FormSourceChangeReason): void {
    if (!source) {
      setInternalSource(nextSource);
    }
    persistDraft(nextSource, storage, resolvedStorageKey(storageKey, nextSource, form));
    onSourceChange?.({ source: nextSource, reason });
  }

  function updateSelection(nextSelection: FormDesignerSelection): void {
    if (!selection) {
      setInternalSelection(nextSelection);
    }
    onSelectionChange?.(nextSelection);
  }

  function restoreVersion(nextSource: FormSource): void {
    applySource(nextSource, "version-restore");
  }

  function addQuestion(questionTypeId: string): void {
    const result = addQuestionSource(currentSource, runtime, currentSelection, questionTypeId);
    updateSelection({ kind: "element", pageId: result.pageId, elementId: result.elementId });
    applySource(result.source, "palette-add-question");
  }

  function addPage(): void {
    const result = addPageSource(currentSource, currentSelection);
    updateSelection({ kind: "page", pageId: result.pageId });
    applySource(result.source, "palette-add-page");
  }

  function duplicatePage(pageId: string): void {
    const result = duplicatePageSource(currentSource, pageId);
    if (!result.pageId) {
      return;
    }
    updateSelection({ kind: "page", pageId: result.pageId });
    applySource(result.source, "canvas-duplicate");
  }

  function deletePage(pageId: string): void {
    updateSelection({ kind: "form" });
    applySource(deletePageSource(currentSource, pageId), "canvas-delete");
  }

  function movePage(pageId: string, direction: -1 | 1): void {
    applySource(movePageSource(currentSource, pageId, direction), "canvas-reorder");
  }

  function duplicateElement(pageId: string, elementId: string): void {
    const result = duplicateElementSource(currentSource, pageId, elementId);
    if (!result.elementId) {
      return;
    }
    updateSelection({ kind: "element", pageId, elementId: result.elementId });
    applySource(result.source, "canvas-duplicate");
  }

  function deleteElement(pageId: string, elementId: string): void {
    updateSelection({ kind: "page", pageId });
    applySource(deleteElementSource(currentSource, pageId, elementId), "canvas-delete");
  }

  function moveElement(pageId: string, elementId: string, direction: -1 | 1): void {
    applySource(moveElementSource(currentSource, pageId, elementId, direction), "canvas-reorder");
  }

  function startTitleEditing(): void {
    const currentTitle = form?.metadata.title ?? "Questionnaire";
    setDraftTitle(currentTitle);
    setEditingTitle(true);
  }

  function persistTitle(): void {
    if (!editingTitle) {
      return;
    }
    const title = draftTitle.trim() || "Questionnaire";
    setEditingTitle(false);
    if (title !== form?.metadata.title) {
      applySource(updateFormMetadataSource(currentSource, { title }), "inspector-edit");
    }
  }

  return (
    <section className="qf-designer">
      <header className="qf-designer-topbar">
        <div className="qf-designer-title">
          {editingTitle ? (
            <input
              autoFocus
              value={draftTitle}
              onBlur={persistTitle}
              onChange={(event) => setDraftTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <button type="button" onDoubleClick={startTitleEditing} title="Double cliquer pour modifier le titre">
              {form?.metadata.title ?? "Questionnaire"}
            </button>
          )}
        </div>
        <div className="qf-designer-actions">
          {actions}
          <div className="qf-mode-action" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label="Mode du designer"
              aria-expanded={openModeMenu}
              onClick={() => setOpenModeMenu((current) => !current)}
            >
              <span>{modeLabel(viewMode)}</span>
              <ChevronIcon />
            </button>
            {openModeMenu ? (
              <div className="qf-workspace-menu" role="menu">
                {resolvedOptions.viewModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === mode}
                    onClick={() => {
                      setViewMode(mode);
                      setOpenModeMenu(false);
                    }}
                  >
                    <span>{modeLabel(mode)}</span>
                    {viewMode === mode ? <span className="qf-menu-check">✓</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {resolvedOptions.showDiagnostics && compileResult.diagnostics.length > 0 ? (
        <ul className="qf-designer-diagnostics">
          {compileResult.diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`} data-severity={diagnostic.severity}>
              <strong>
                {diagnostic.code}
                {diagnosticLocation(diagnostic) ? <small>{diagnosticLocation(diagnostic)}</small> : null}
              </strong>
              <span>{diagnostic.message}</span>
              {diagnostic.hint ? <em>{diagnostic.hint}</em> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {recoveredAt ? (
        <div className="qf-recovery-notice">
          <span>Brouillon restaure du {new Date(recoveredAt).toLocaleString("fr-FR")}.</span>
          <button type="button" onClick={() => setRecoveredAt(null)}>
            Fermer
          </button>
        </div>
      ) : null}

      {viewMode === "yaml" ? (
        <FormYamlEditor
          source={currentSource}
          diagnostics={compileResult.diagnostics}
          onSourceChange={(nextSource) => applySource(nextSource, "yaml-edit")}
        />
      ) : null}

      {viewMode === "preview" ? (
        <FormPreview
          result={compileResult}
          runtime={runtime}
          showDiagnostics={resolvedOptions.showDiagnostics}
          showHeaderTitle={false}
        />
      ) : null}

      {viewMode === "form" ? (
        <div className="qf-designer-workspace">
          <DesignerCanvas
            form={form}
            diagnostics={compileResult.diagnostics}
            selection={currentSelection}
            editMode={resolvedOptions.canvasEditMode}
            onSelectionChange={updateSelection}
            onUpdateElement={(pageId, elementId, patch) =>
              applySource(updateElementSource(currentSource, pageId, elementId, patch), "inspector-edit")
            }
            onDuplicatePage={duplicatePage}
            onDeletePage={deletePage}
            onMovePage={movePage}
            onDuplicateElement={duplicateElement}
            onDeleteElement={deleteElement}
            onMoveElement={moveElement}
          />
          <aside className="qf-designer-sidebar">
            <FormInspector
              form={form}
              selection={currentSelection}
              onUpdateForm={(patch) =>
                applySource(updateFormMetadataSource(currentSource, patch), "inspector-edit")
              }
              onUpdateFormSettings={(patch) =>
                applySource(updateFormSettingsSource(currentSource, patch), "inspector-edit")
              }
              onUpdatePage={(pageId, patch) =>
                applySource(updatePageSource(currentSource, pageId, patch), "inspector-edit")
              }
              onUpdateElement={(pageId, elementId, patch) =>
                applySource(updateElementSource(currentSource, pageId, elementId, patch), "inspector-edit")
              }
            />
            <QuestionPalette runtime={runtime} onAddQuestion={addQuestion} onAddPage={addPage} />
            {storage ? (
              <VersionHistoryPanel
                storage={storage}
                storageKey={resolvedStorageKey(storageKey, currentSource, form)}
                source={currentSource}
                onRestore={restoreVersion}
              />
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function getCompiledForm(result: CompileFormResult): CompiledForm | null {
  return result.status === "valid" || result.status === "degraded" ? result.form : null;
}

function diagnosticLocation(diagnostic: FormDiagnostic): string | null {
  if (diagnostic.range) {
    return `ligne ${diagnostic.range.start.line}, colonne ${diagnostic.range.start.column}`;
  }
  if (diagnostic.path && diagnostic.path.length > 0) {
    return diagnostic.path.join(".");
  }
  return null;
}

function persistDraft(
  source: FormSource,
  storage: false | FormDesignerPersistenceAdapter,
  key: string,
): void {
  if (!storage) {
    return;
  }

  void storage.saveDraft({
    key,
    source,
    updatedAt: new Date().toISOString(),
    apiVersion: FORM_RUNTIME_PUBLIC_API_VERSION,
  });
}

function resolvedStorageKey(
  explicitKey: string | undefined,
  source: FormSource,
  form: CompiledForm | null,
): string {
  return explicitKey ?? form?.id ?? source.uri ?? "default";
}

function modeLabel(mode: FormDesignerViewMode): string {
  switch (mode) {
    case "form":
      return "Formulaire";
    case "yaml":
      return "YAML";
    case "preview":
      return "Preview";
  }
}

function ChevronIcon(): React.ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <path d="M5.8 7.4 10 11.6l4.2-4.2 1.1 1.2-5.3 5.2-5.3-5.2 1.1-1.2Z" />
    </svg>
  );
}
