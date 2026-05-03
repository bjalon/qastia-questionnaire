import { describe, expect, it } from "vitest";
import {
  buildSubmitPayload,
  compileForm,
  createFormRuntime,
  defaultFormRuntime,
  LocalStorageFormDesignerPersistenceAdapter,
  validateAndBuildSubmitPayload,
  validateAnswers,
  type FormSource,
  type QuestionTypeDefinition,
} from "../src";
import { rangeForPath } from "../src/compiler";
import {
  addQuestionSource,
  deleteElementSource,
  deletePageSource,
  duplicateElementSource,
  duplicatePageSource,
  moveElementSource,
  movePageSource,
  updateElementSource,
} from "../src/designer/sourceMutations";

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

  it("adds related diagnostics for duplicate ids", () => {
    const result = compileForm({
      content: validSource.content.replace("id: score", "id: name"),
    });

    const duplicate = result.diagnostics.find((diagnostic) => diagnostic.code === "ELEMENT_DUPLICATE_ID");
    expect(duplicate?.related?.[0]?.message).toContain('Premiere declaration de "name"');
    expect(duplicate?.related?.[0]?.range?.start.line).toBe(9);
  });

  it("returns French schema diagnostics", () => {
    const result = compileForm({
      content: validSource.content.replace("required: true", "required: oui"),
    });

    const schemaDiagnostic = result.diagnostics.find((diagnostic) => diagnostic.code === "SCHEMA_INVALID_VALUE");
    expect(schemaDiagnostic?.message).toContain("a un type invalide");
    expect(schemaDiagnostic?.message).toContain("valeur attendue");
    expect(schemaDiagnostic?.range?.start.line).toBe(13);
  });
});

describe("source map", () => {
  it("locates nested YAML paths", () => {
    const range = rangeForPath(validSource.content, ["pages", "0", "elements", "1", "questionType"]);

    expect(range?.start.line).toBe(16);
    expect(range?.start.column).toBe(9);
  });

  it("locates inline YAML collections", () => {
    const source = "pages: [{ id: page_1, elements: [{ id: q1, title: Hello }] }]\n";
    const range = rangeForPath(source, ["pages", "0", "elements", "0", "title"]);

    expect(range?.start.line).toBe(1);
    expect(range?.start.column).toBe(44);
  });

  it("locates paths around comments, anchors and multiline values", () => {
    const source = `# commentaire
metadata:
  title: &title |
    Ligne 1
    Ligne 2
pages:
  - id: page_1
    title: *title
    elements: []
`;

    expect(rangeForPath(source, ["metadata", "title"])?.start.line).toBe(3);
    expect(rangeForPath(source, ["pages", "0", "title"])?.start.line).toBe(8);
  });
});

describe("runtime registries", () => {
  const baseTextQuestion = defaultFormRuntime.questionTypes.get("short-text");

  it("throws on registry collisions by default", () => {
    if (!baseTextQuestion) {
      throw new Error("Expected default question type");
    }

    expect(() => createFormRuntime({ questionTypes: [baseTextQuestion] })).toThrow("Duplicate question type id");
  });

  it("supports override and keep-first collision strategies", () => {
    if (!baseTextQuestion) {
      throw new Error("Expected default question type");
    }

    const overriddenRuntime = createFormRuntime({
      questionTypes: [{ ...baseTextQuestion, label: "Texte remplace" }],
      collisionStrategy: "override",
    });
    const keptRuntime = createFormRuntime({
      questionTypes: [{ ...baseTextQuestion, label: "Texte remplace" }],
      collisionStrategy: "keep-first",
    });

    expect(overriddenRuntime.questionTypes.get("short-text")?.label).toBe("Texte remplace");
    expect(keptRuntime.questionTypes.get("short-text")?.label).toBe(baseTextQuestion.label);
  });

  it("compiles a custom question type", () => {
    const consentQuestion: QuestionTypeDefinition = {
      id: "consent",
      label: "Consentement",
      description: "Case de consentement applicative.",
      defaultTitle: "J'accepte",
      defaultConfig: {},
      createDefaultQuestion: (id) => ({
        id,
        type: "question",
        questionType: "consent",
        title: "J'accepte",
        required: true,
      }),
      normalizeConfig: (config) => config,
      validateConfig: () => [],
      validateAnswer: (question, value) => (question.required && value !== true ? "Le consentement est obligatoire." : null),
      serializeAnswer: (value) => (value === true ? true : undefined),
    };

    const runtime = createFormRuntime({ questionTypes: [consentQuestion] });
    const result = compileForm(
      {
        content: validSource.content.replace("questionType: short-text", "questionType: consent"),
      },
      runtime,
    );

    expect(result.status).toBe("valid");
    if (result.status === "invalid") {
      throw new Error("Expected custom question to compile");
    }
    expect(result.form.pages[0]?.elements[0]?.type === "question"
      ? result.form.pages[0]?.elements[0]?.questionType
      : undefined).toBe("consent");
  });

  it("runs global validators during submission validation", () => {
    const result = compileForm(validSource);
    if (result.status === "invalid") {
      throw new Error("Expected compilable form");
    }

    const runtime = createFormRuntime({
      validators: [
        {
          id: "forbidden-demo-answer",
          validate: (question, answers) =>
            question.id === "name" && answers.name === "demo"
              ? [
                  {
                    code: "QUESTION_INVALID_CONFIG",
                    severity: "error",
                    message: "Cette valeur est reservee.",
                    elementId: question.id,
                  },
                ]
              : [],
        },
      ],
    });

    expect(validateAnswers(result.form, { name: "demo" }, runtime)).toContainEqual({
      questionId: "name",
      pageId: "page_1",
      message: "Cette valeur est reservee.",
    });
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

  it("validates V1 question answer types", () => {
    const source: FormSource = {
      content: `version: 1
kind: form
pages:
  - id: page_1
    title: Page 1
    elements:
      - id: short
        type: question
        questionType: short-text
        title: Texte
        validation:
          minLength: 3
      - id: long
        type: question
        questionType: long-text
        title: Texte long
      - id: yes
        type: question
        questionType: yes-no
        title: Oui non
      - id: single
        type: question
        questionType: single-choice
        title: Unique
        options:
          - value: a
            label: A
      - id: multiple
        type: question
        questionType: multiple-choice
        title: Multiple
        options:
          - value: a
            label: A
      - id: dropdown
        type: question
        questionType: dropdown
        title: Liste
        options:
          - value: a
            label: A
      - id: number
        type: question
        questionType: number
        title: Nombre
        validation:
          integer: true
      - id: date
        type: question
        questionType: date
        title: Date
      - id: scale
        type: question
        questionType: linear-scale
        title: Echelle
        config:
          min: 1
          max: 3
      - id: rating
        type: question
        questionType: rating
        title: Note
        config:
          max: 5
`,
    };
    const result = compileForm(source);
    if (result.status === "invalid") {
      throw new Error("Expected compilable form");
    }

    const errors = validateAnswers(result.form, {
      short: "ab",
      long: 2,
      yes: "oui",
      single: "z",
      multiple: ["z"],
      dropdown: "z",
      number: 1.5,
      date: "03/05/2026",
      scale: 4,
      rating: 6,
    });

    expect(errors.map((error) => error.questionId)).toEqual([
      "short",
      "long",
      "yes",
      "single",
      "multiple",
      "dropdown",
      "number",
      "date",
      "scale",
      "rating",
    ]);
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

  it("prunes versions by count, age and byte size", async () => {
    const values = new Map<string, string>();
    const adapter = new LocalStorageFormDesignerPersistenceAdapter({
      maxVersions: 3,
      maxVersionAgeDays: 365,
      maxVersionsBytes: 900,
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      },
    });

    for (let index = 0; index < 5; index += 1) {
      await adapter.saveVersion({
        id: `version_${index}`,
        key: "demo",
        source: { content: `${validSource.content}\n# ${index}` },
        createdAt: `2026-05-0${index + 1}T20:00:00.000Z`,
        label: `Version ${index}`,
        apiVersion: 1,
      });
    }
    await adapter.saveVersion({
      id: "old",
      key: "demo",
      source: validSource,
      createdAt: "2020-01-01T20:00:00.000Z",
      label: "Old",
      apiVersion: 1,
    });

    const versions = await adapter.listVersions("demo");
    expect(versions.length).toBeLessThanOrEqual(3);
    expect(versions.some((version) => version.id === "old")).toBe(false);
  });
});

describe("designer mutations", () => {
  it("adds a question through structured YAML parsing", () => {
    const result = addQuestionSource(
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
    const nextSource = updateElementSource(validSource, "page_1", "name", {
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

  it("duplicates, reorders and deletes pages and questions", () => {
    const duplicatedPage = duplicatePageSource(validSource, "page_1");
    let compiled = compileForm(duplicatedPage.source);
    expect(duplicatedPage.pageId).toBe("page_1_copy_1");
    expect(compiled.status).not.toBe("invalid");
    if (compiled.status === "invalid") {
      throw new Error("Expected duplicated page source to compile");
    }
    expect(compiled.form.pages).toHaveLength(2);

    const movedPage = movePageSource(duplicatedPage.source, duplicatedPage.pageId, -1);
    compiled = compileForm(movedPage);
    expect(compiled.status !== "invalid" ? compiled.form.pages[0]?.id : undefined).toBe(duplicatedPage.pageId);

    const duplicatedElement = duplicateElementSource(validSource, "page_1", "name");
    compiled = compileForm(duplicatedElement.source);
    expect(duplicatedElement.elementId).toBe("name_copy_1");
    expect(compiled.status).not.toBe("invalid");
    if (compiled.status === "invalid") {
      throw new Error("Expected duplicated element source to compile");
    }
    expect(compiled.form.pages[0]?.elements).toHaveLength(3);

    const movedElement = moveElementSource(duplicatedElement.source, "page_1", duplicatedElement.elementId, -1);
    compiled = compileForm(movedElement);
    expect(compiled.status !== "invalid" ? compiled.form.pages[0]?.elements[0]?.id : undefined).toBe(duplicatedElement.elementId);

    const deletedElement = deleteElementSource(duplicatedElement.source, "page_1", duplicatedElement.elementId);
    compiled = compileForm(deletedElement);
    expect(compiled.status).not.toBe("invalid");
    if (compiled.status === "invalid") {
      throw new Error("Expected deleted element source to compile");
    }
    expect(compiled.form.pages[0]?.elements).toHaveLength(2);

    const deletedPage = deletePageSource(duplicatedPage.source, duplicatedPage.pageId);
    compiled = compileForm(deletedPage);
    expect(compiled.status).not.toBe("invalid");
    if (compiled.status === "invalid") {
      throw new Error("Expected deleted page source to compile");
    }
    expect(compiled.form.pages).toHaveLength(1);
  });
});
