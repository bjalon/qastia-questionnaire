import type React from "react";
import type {
  CompileFormResult,
  FormDesignerPersistenceAdapter,
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
  | "canvas-duplicate"
  | "canvas-delete"
  | "canvas-reorder"
  | "inspector-edit"
  | "version-restore";

export type FormSourceChangeEvent = {
  readonly source: FormSource;
  readonly reason: FormSourceChangeReason;
};

export type FormDesignerOptions = {
  readonly showDiagnostics: boolean;
  readonly defaultViewMode: FormDesignerViewMode;
  readonly viewModes: readonly FormDesignerViewMode[];
  readonly autoSaveValidVersions: boolean;
};

export type FormDesignerProps = {
  readonly source?: FormSource;
  readonly defaultSource?: FormSource;
  readonly runtime?: FormRuntime;
  readonly actions?: React.ReactNode;
  readonly storage?: false | FormDesignerPersistenceAdapter;
  readonly storageKey?: string;
  readonly selection?: FormDesignerSelection;
  readonly defaultSelection?: FormDesignerSelection;
  readonly options?: Partial<FormDesignerOptions>;
  readonly onSourceChange?: (event: FormSourceChangeEvent) => void;
  readonly onSelectionChange?: (selection: FormDesignerSelection) => void;
  readonly onCompile?: (result: CompileFormResult) => void;
};
