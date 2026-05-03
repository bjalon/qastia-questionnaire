import type { FormDiagnostic } from "./Diagnostic";
import type { CompiledForm, DebugFormViewModel } from "./Form";

export type CompileMode = "authoring" | "strict";

export type CompileFormOptions = {
  readonly mode?: CompileMode;
};

export type CompileFormResult =
  | {
      readonly status: "valid";
      readonly form: CompiledForm;
      readonly diagnostics: readonly [];
    }
  | {
      readonly status: "degraded";
      readonly form: CompiledForm;
      readonly diagnostics: readonly FormDiagnostic[];
    }
  | {
      readonly status: "invalid";
      readonly fallback: DebugFormViewModel;
      readonly diagnostics: readonly FormDiagnostic[];
    };
