import type { FormDiagnostic, FormDiagnosticCode, SourceRange } from "../publicTypes";

export function diagnostic(
  code: FormDiagnosticCode,
  message: string,
  options: {
    readonly severity?: FormDiagnostic["severity"];
    readonly path?: readonly string[];
    readonly range?: SourceRange;
    readonly pageId?: string;
    readonly elementId?: string;
    readonly hint?: string;
  } = {},
): FormDiagnostic {
  return {
    code,
    severity: options.severity ?? "error",
    message,
    path: options.path,
    range: options.range,
    pageId: options.pageId,
    elementId: options.elementId,
    hint: options.hint,
  };
}
