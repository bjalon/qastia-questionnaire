import type React from "react";
import type {
  CompileFormResult,
  FormRuntime,
  FormSource,
} from "../publicTypes";

export type FormDesignerViewMode = "form" | "yaml" | "preview";

export type FormDesignerSelection =
  | { readonly kind: "form" }
  | { readonly kind: "page"; readonly pageId: string }
  | { readonly kind: "element"; readonly pageId: string; readonly elementId: string };

export type FormSourceChangeReason =
  | "yaml-edit"
  | "palette-add-question"
  | "palette-add-page"
  | "inspector-edit";

export type FormSourceChangeEvent = {
  readonly source: FormSource;
  readonly reason: FormSourceChangeReason;
};

export type FormDesignerOptions = {
  readonly showDiagnostics: boolean;
};

export type FormDesignerProps = {
  readonly source?: FormSource;
  readonly defaultSource?: FormSource;
  readonly runtime?: FormRuntime;
  readonly actions?: React.ReactNode;
  readonly options?: Partial<FormDesignerOptions>;
  readonly onSourceChange?: (event: FormSourceChangeEvent) => void;
  readonly onCompile?: (result: CompileFormResult) => void;
};
