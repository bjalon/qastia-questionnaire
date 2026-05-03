import assert from "node:assert/strict";
import {
  FORM_RUNTIME_PUBLIC_API_VERSION,
  compileForm,
  defaultFormRuntime,
} from "@bjalon/form-runtime";
import { rangeForPath } from "@bjalon/form-runtime/compiler";
import { FormDesigner } from "@bjalon/form-runtime/designer";
import { FormPreview } from "@bjalon/form-runtime/preview";
import { FormRunner } from "@bjalon/form-runtime/runner";
import { createFormRuntime } from "@bjalon/form-runtime/runtime";
import { LocalStorageFormDesignerPersistenceAdapter } from "@bjalon/form-runtime/storage";

assert.equal(typeof FormDesigner, "function");
assert.equal(typeof FormPreview, "function");
assert.equal(typeof FormRunner, "function");
assert.equal(typeof createFormRuntime, "function");

await assert.rejects(
  () => import("@bjalon/form-runtime/designer/sourceMutations"),
  (error) => error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
);

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
