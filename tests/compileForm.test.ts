import { describe, expect, it } from "vitest";
import {
  buildSubmitPayload,
  compileForm,
  defaultFormRuntime,
  LocalStorageFormDesignerPersistenceAdapter,
  validateAndBuildSubmitPayload,
  validateAnswers,
  type FormSource,
} from "../src";
import { rangeForPath } from "../src/compiler";
import { __designerMutationTestApi } from "../src/designer/sourceMutations";

const validSource: FormSource = {
  content: `version: 1
kind: form
metadata:
  title: "Test"
pages:
  - id: page_1
    title: "Page 1"
    elements:
      - id: name
        type: question
        questionType: short-text
        title: "Nom"
        required: true
      - id: score
        type: question
        questionType: linear-scale
        title: "Score"
        config:
          min: 1
          max: 5
`,
};

describe("compileForm", () => {
  it("compiles a valid V1 YAML form", () => {
    const result = compileForm(validSource);

    expect(result.status).toBe("valid");
    if (result.status !== "valid") {
      throw new Error("Expected valid result");
    }
    expect(result.form.metadata.title).toBe("Test");
    expect(result.form.pages[0]?.elements).toHaveLength(2);
  });

  it("returns diagnostics for an unknown question type", () => {
    const result = compileForm({
      content: validSource.content.replace("short-text", "unknown-type"),
    });

    expect(result.status).toBe("degraded");
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "QUESTION_UNKNOWN_TYPE")).toBe(true);
    expect(result.diagnostics.find((diagnostic) => diagnostic.code === "QUESTION_UNKNOWN_TYPE")?.range?.start.line).toBe(11);
  });

  it("treats unknown fields as errors in strict mode", () => {
    const result = compileForm(
      {
        content: validSource.content.replace("metadata:", "extra: true\nmetadata:"),
      },
      defaultFormRuntime,
      { mode: "strict" },
    );

    expect(result.status).toBe("invalid");
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "SCHEMA_UNKNOWN_FIELD")).toBe(true);
  });

  it("returns invalid for malformed YAML", () => {
    const result = compileForm({ content: "version: 1\nkind: form\npages:\n  - id: [" });

    expect(result.status).toBe("invalid");
    expect(result.diagnostics[0]?.code).toBe("YAML_SYNTAX_ERROR");
  });
});

describe("source map", () => {
  it("locates nested YAML paths", () => {
    const range = rangeForPath(validSource.content, ["pages", "0", "elements", "1", "questionType"]);

    expect(range?.start.line).toBe(16);
    expect(range?.start.column).toBe(9);
  });
});

describe("submission", () => {
  it("blocks missing required answers", () => {
    const result = compileForm(validSource);
    if (result.status === "invalid") {
      throw new Error("Expected compilable form");
    }

    const errors = validateAnswers(result.form, {});
    expect(errors).toEqual([
      { questionId: "name", pageId: "page_1", message: "Cette question est obligatoire." },
    ]);
  });

  it("validates and builds a stable submit payload", () => {
    const result = compileForm(validSource);
    if (result.status === "invalid") {
      throw new Error("Expected compilable form");
    }

    const validationResult = validateAndBuildSubmitPayload(
      result.form,
      { name: "Sophie", score: 4 },
      undefined,
      new Date("2026-05-03T20:00:00.000Z"),
    );

    expect(validationResult.status).toBe("valid");
    if (validationResult.status !== "valid") {
      throw new Error("Expected valid submit payload");
    }

    const payload = validationResult.payload;
    expect(payload).toMatchObject({
      form: {
        id: "form",
        title: "Test",
        version: 1,
      },
      submittedAt: "2026-05-03T20:00:00.000Z",
      answers: {
        name: "Sophie",
        score: 4,
      },
      pages: [
        {
          id: "page_1",
          title: "Page 1",
        },
      ],
    });
  });
});

describe("storage adapters", () => {
  it("persists designer drafts without React", async () => {
    const values = new Map<string, string>();
    const adapter = new LocalStorageFormDesignerPersistenceAdapter({
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      },
    });

    await adapter.saveDraft({
      key: "demo",
      source: validSource,
      updatedAt: "2026-05-03T20:00:00.000Z",
      apiVersion: 1,
    });

    const draft = await adapter.loadDraft("demo");
    expect(draft?.source.content).toBe(validSource.content);

    await adapter.clearDraft("demo");
    expect(await adapter.loadDraft("demo")).toBeNull();
  });
});

describe("designer mutations", () => {
  it("adds a question through structured YAML parsing", () => {
    const result = __designerMutationTestApi.addQuestionSource(
      validSource,
      defaultFormRuntime,
      { kind: "page", pageId: "page_1" },
      "yes-no",
    );
    const compiled = compileForm(result.source);

    expect(result.elementId).toBe("yes_no_1");
    expect(compiled.status).not.toBe("invalid");
    if (compiled.status === "invalid") {
      throw new Error("Expected compilable source");
    }
    expect(compiled.form.pages[0]?.elements.some((element) => element.id === "yes_no_1")).toBe(true);
  });

  it("updates inspector fields in YAML", () => {
    const nextSource = __designerMutationTestApi.updateElementSource(validSource, "page_1", "name", {
      title: "Nom complet",
      required: false,
    });
    const compiled = compileForm(nextSource);

    expect(compiled.status).not.toBe("invalid");
    if (compiled.status === "invalid") {
      throw new Error("Expected compilable source");
    }
    const question = compiled.form.pages[0]?.elements.find((element) => element.id === "name");
    expect(question?.title).toBe("Nom complet");
    expect(question?.type === "question" ? question.required : undefined).toBe(false);
  });
});
