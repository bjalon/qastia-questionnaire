import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { compileForm } from "../compiler/compileForm";
import { defaultFormRuntime } from "../runtime/defaultFormRuntime";
import { FormPreview } from "../preview/FormPreview";
import type {
  CompileFormResult,
  CompiledForm,
  FormSource,
} from "../publicTypes";
import { DesignerCanvas } from "./canvas/DesignerCanvas";
import { defaultDesignerOptions } from "./defaultDesignerOptions";
import { FormInspector } from "./inspector/FormInspector";
import { QuestionPalette } from "./palette/QuestionPalette";
import {
  addPageSource,
  addQuestionSource,
  updateElementSource,
  updateFormMetadataSource,
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
  options,
  onSourceChange,
  onCompile,
}: FormDesignerProps): React.ReactElement {
  const [internalSource, setInternalSource] = useState<FormSource>(defaultSource);
  const [viewMode, setViewMode] = useState<FormDesignerViewMode>("form");
  const [selection, setSelection] = useState<FormDesignerSelection>({ kind: "form" });
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [openModeMenu, setOpenModeMenu] = useState(false);
  const resolvedOptions = { ...defaultDesignerOptions, ...options };
  const currentSource = source ?? internalSource;
  const compileResult = useMemo(
    () => compileForm(currentSource, runtime, { mode: "authoring" }),
    [currentSource, runtime],
  );
  const form = getCompiledForm(compileResult);

  useEffect(() => {
    onCompile?.(compileResult);
  }, [compileResult, onCompile]);

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
    onSourceChange?.({ source: nextSource, reason });
  }

  function addQuestion(questionTypeId: string): void {
    const result = addQuestionSource(currentSource, runtime, selection, questionTypeId);
    setSelection({ kind: "element", pageId: result.pageId, elementId: result.elementId });
    applySource(result.source, "palette-add-question");
  }

  function addPage(): void {
    const result = addPageSource(currentSource, selection);
    setSelection({ kind: "page", pageId: result.pageId });
    applySource(result.source, "palette-add-page");
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
                {(["form", "yaml", "preview"] as const).map((mode) => (
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
              <strong>{diagnostic.code}</strong>
              <span>{diagnostic.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {viewMode === "yaml" ? (
        <textarea
          className="qf-yaml-editor"
          spellCheck={false}
          value={currentSource.content}
          onChange={(event) =>
            applySource({ ...currentSource, content: event.currentTarget.value }, "yaml-edit")
          }
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
            selection={selection}
            onSelectionChange={setSelection}
          />
          <aside className="qf-designer-sidebar">
            <QuestionPalette runtime={runtime} onAddQuestion={addQuestion} onAddPage={addPage} />
            <FormInspector
              form={form}
              selection={selection}
              onUpdateForm={(patch) =>
                applySource(updateFormMetadataSource(currentSource, patch), "inspector-edit")
              }
              onUpdatePage={(pageId, patch) =>
                applySource(updatePageSource(currentSource, pageId, patch), "inspector-edit")
              }
              onUpdateElement={(pageId, elementId, patch) =>
                applySource(updateElementSource(currentSource, pageId, elementId, patch), "inspector-edit")
              }
            />
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function getCompiledForm(result: CompileFormResult): CompiledForm | null {
  return result.status === "valid" || result.status === "degraded" ? result.form : null;
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
