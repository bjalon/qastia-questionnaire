import type { FormDesignerOptions } from "./types";

export const defaultDesignerOptions: FormDesignerOptions = {
  showDiagnostics: true,
  defaultViewMode: "form",
  viewModes: ["form", "yaml", "preview"],
  autoSaveValidVersions: true,
};
