import assert from "node:assert/strict";
import {
  FORM_RUNTIME_PUBLIC_API_VERSION,
  compileForm,
  defaultFormRuntime,
} from "../dist/form-runtime.js";
import { rangeForPath } from "../dist/compiler.js";
import { LocalStorageFormDesignerPersistenceAdapter } from "../dist/storage.js";

const source = {
  content: `version: 1
kind: form
metadata:
  title: "Smoke"
pages:
  - id: page_1
    title: "Page 1"
    elements:
      - id: name
        type: question
        questionType: short-text
        title: "Nom"
`,
};

const result = compileForm(source, defaultFormRuntime, { mode: "strict" });
assert.equal(result.status, "valid");
assert.equal(FORM_RUNTIME_PUBLIC_API_VERSION, 1);
assert.equal(rangeForPath(source.content, ["pages", "0", "elements", "0", "title"])?.start.line, 12);

const values = new Map();
const adapter = new LocalStorageFormDesignerPersistenceAdapter({
  storage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
});

await adapter.saveVersion({
  id: "smoke",
  key: "demo",
  source,
  createdAt: "2026-05-03T20:00:00.000Z",
  label: "Smoke",
  apiVersion: 1,
});
assert.equal((await adapter.listVersions("demo")).length, 1);
