import { useEffect, useRef } from "react";
import type React from "react";
import { yaml } from "@codemirror/lang-yaml";
import {
  forceLinting,
  lintGutter,
  linter,
  type Diagnostic as CodeMirrorDiagnostic,
} from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
} from "@codemirror/view";
import type { FormDiagnostic, FormSource } from "../../publicTypes";

export type FormYamlEditorProps = {
  readonly source: FormSource;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly onSourceChange: (source: FormSource) => void;
};

export function FormYamlEditor({
  source,
  diagnostics,
  onSourceChange,
}: FormYamlEditorProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const sourceRef = useRef(source);
  const diagnosticsRef = useRef(diagnostics);
  const onSourceChangeRef = useRef(onSourceChange);

  useEffect(() => {
    onSourceChangeRef.current = onSourceChange;
  }, [onSourceChange]);

  useEffect(() => {
    sourceRef.current = source;
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === source.content) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: source.content,
      },
    });
  }, [source]);

  useEffect(() => {
    diagnosticsRef.current = diagnostics;
    if (viewRef.current) {
      forceLinting(viewRef.current);
    }
  }, [diagnostics]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: sourceRef.current.content,
        extensions: [
          lineNumbers(),
          lintGutter(),
          yaml(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) {
              return;
            }
            const content = update.state.doc.toString();
            sourceRef.current = { ...sourceRef.current, content };
            onSourceChangeRef.current(sourceRef.current);
          }),
          linter((view) => codeMirrorDiagnostics(view, diagnosticsRef.current)),
          EditorView.theme({
            "&": {
              minHeight: "640px",
              fontSize: "13px",
            },
            ".cm-scroller": {
              minHeight: "640px",
              fontFamily: "\"JetBrains Mono\", \"SFMono-Regular\", Consolas, monospace",
              lineHeight: "1.5",
            },
            ".cm-content": {
              padding: "12px 0",
            },
            ".cm-line": {
              padding: "0 12px",
            },
            ".cm-gutters": {
              backgroundColor: "#f4f7f6",
              borderRight: "1px solid #d9e2df",
            },
          }),
        ],
      }),
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      if (viewRef.current === view) {
        viewRef.current = null;
      }
    };
  }, []);

  function focusDiagnostic(diagnostic: FormDiagnostic): void {
    const view = viewRef.current;
    if (!diagnostic.range || !view) {
      return;
    }

    const from = clampOffset(diagnostic.range.start.offset, view.state.doc.length);
    const to = clampOffset(diagnostic.range.end.offset, view.state.doc.length);
    view.focus();
    view.dispatch({
      selection: { anchor: from, head: to },
      scrollIntoView: true,
    });
  }

  return (
    <section className="qf-yaml-mode">
      <div ref={containerRef} className="qf-yaml-editor" />
      <aside className="qf-yaml-diagnostics">
        <h2>Diagnostics</h2>
        {diagnostics.length === 0 ? (
          <p>Aucun diagnostic.</p>
        ) : (
          <ul>
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`}>
                <button type="button" onClick={() => focusDiagnostic(diagnostic)}>
                  <strong>{diagnostic.code}</strong>
                  <span>{diagnostic.message}</span>
                  {diagnostic.range ? (
                    <small>
                      ligne {diagnostic.range.start.line}, colonne {diagnostic.range.start.column}
                    </small>
                  ) : diagnostic.path ? (
                    <small>{diagnostic.path.join(".")}</small>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  );
}

function codeMirrorDiagnostics(
  view: EditorView,
  diagnostics: readonly FormDiagnostic[],
): readonly CodeMirrorDiagnostic[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.range)
    .map((diagnostic) => {
      const range = diagnostic.range;
      const from = clampOffset(range?.start.offset ?? 0, view.state.doc.length);
      const to = clampOffset(range?.end.offset ?? from, view.state.doc.length);
      return {
        from,
        to: Math.max(from, to),
        severity: diagnostic.severity,
        message: diagnostic.hint ? `${diagnostic.message}\n${diagnostic.hint}` : diagnostic.message,
        source: diagnostic.code,
      };
    });
}

function clampOffset(offset: number, max: number): number {
  return Math.max(0, Math.min(offset, max));
}
