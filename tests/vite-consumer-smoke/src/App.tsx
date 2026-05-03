import { compileForm } from "@bjalon/form-runtime/compiler";
import { defaultFormRuntime } from "@bjalon/form-runtime/runtime";
import { FormRunner } from "@bjalon/form-runtime/runner";
import "@bjalon/form-runtime/styles.css";
import { createRoot } from "react-dom/client";

const source = {
  content: `version: 1
kind: form
metadata:
  title: "Smoke consommateur"
pages:
  - id: page_1
    title: "Page 1"
    elements:
      - id: q_1
        type: question
        questionType: short-text
        title: "Votre nom"
`,
};

const result = compileForm(source, defaultFormRuntime, { mode: "strict" });

function App() {
  if (result.status !== "valid") {
    return null;
  }

  return <FormRunner form={result.form} runtime={defaultFormRuntime} />;
}

createRoot(document.getElementById("root")!).render(<App />);
