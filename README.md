# @bjalon/form-runtime

Librairie React/TypeScript pour compiler et rendre des questionnaires YAML.

## Scripts

```bash
npm run typecheck
npm test
npm run build
npm run dev:example
```

## Exemple

```tsx
import { FormRunner, compileForm } from "@bjalon/form-runtime";
import "@bjalon/form-runtime/styles.css";

const result = compileForm({
  content: `
version: 1
kind: form
metadata:
  title: "Questionnaire"
pages:
  - id: page_1
    title: "Page 1"
    elements:
      - id: name
        type: question
        questionType: short-text
        title: "Nom"
        required: true
`,
});

export function App() {
  if (result.status === "invalid") return null;
  return <FormRunner form={result.form} onSubmit={(event) => console.log(event.payload)} />;
}
```
