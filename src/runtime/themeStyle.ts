import type React from "react";
import type { CompiledForm, FormRuntime } from "../publicTypes";
import { defaultFormRuntime } from "./defaultFormRuntime";

export function formThemeStyle(
  form: CompiledForm,
  runtime: FormRuntime = defaultFormRuntime,
): React.CSSProperties {
  const theme = runtime.themes.get(form.theme.id);
  return theme?.tokens as React.CSSProperties ?? {};
}
