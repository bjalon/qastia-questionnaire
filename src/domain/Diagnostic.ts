import type { SourceRange } from "./SourceRange";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type FormDiagnosticCode =
  | "YAML_SYNTAX_ERROR"
  | "FORM_UNSUPPORTED_VERSION"
  | "FORM_INVALID_KIND"
  | "PAGE_MISSING_ID"
  | "PAGE_DUPLICATE_ID"
  | "PAGE_EMPTY"
  | "ELEMENT_MISSING_ID"
  | "ELEMENT_DUPLICATE_ID"
  | "ELEMENT_UNKNOWN_TYPE"
  | "QUESTION_UNKNOWN_TYPE"
  | "QUESTION_MISSING_TITLE"
  | "QUESTION_INVALID_CONFIG"
  | "QUESTION_INVALID_OPTIONS"
  | "SCHEMA_UNKNOWN_FIELD"
  | "SCHEMA_MISSING_FIELD"
  | "SCHEMA_INVALID_VALUE";

export type RelatedDiagnostic = {
  readonly message: string;
  readonly range?: SourceRange;
};

export type FormDiagnostic = {
  readonly code: FormDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly path?: readonly string[];
  readonly range?: SourceRange;
  readonly pageId?: string;
  readonly elementId?: string;
  readonly hint?: string;
  readonly related?: readonly RelatedDiagnostic[];
};
