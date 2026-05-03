export type FormSource = {
  readonly uri?: string;
  readonly content: string;
};

export type FormId = string;
export type PageId = string;
export type ElementId = string;
export type QuestionId = ElementId;
export type QuestionTypeId = string;

export type FormMetadata = {
  readonly title: string;
  readonly description?: string;
  readonly locale?: string;
};

export type RawForm = {
  readonly version?: unknown;
  readonly kind?: unknown;
  readonly id?: unknown;
  readonly metadata?: unknown;
  readonly theme?: unknown;
  readonly navigation?: unknown;
  readonly pages?: unknown;
};

export type RawFormPage = {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly description?: unknown;
  readonly elements?: unknown;
};

export type RawFormElement = {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly questionType?: unknown;
  readonly title?: unknown;
  readonly description?: unknown;
  readonly required?: unknown;
  readonly options?: unknown;
  readonly config?: unknown;
  readonly validation?: unknown;
};

export type QuestionOption = {
  readonly value: string;
  readonly label: string;
};

export type FormNavigationMode = "single-page" | "paged";

export type CompiledForm = {
  readonly id: FormId;
  readonly version: 1;
  readonly kind: "form";
  readonly sourceUri?: string;
  readonly sourceHash: string;
  readonly metadata: FormMetadata;
  readonly theme: CompiledTheme;
  readonly navigation: FormNavigationMode;
  readonly pages: readonly CompiledFormPage[];
};

export type CompiledTheme = {
  readonly id: string;
};

export type CompiledFormPage = {
  readonly id: PageId;
  readonly title: string;
  readonly description?: string;
  readonly elements: readonly CompiledFormElement[];
};

export type CompiledFormElement = CompiledQuestionElement | CompiledStatementElement;

export type CompiledQuestionElement = {
  readonly id: QuestionId;
  readonly type: "question";
  readonly questionType: QuestionTypeId;
  readonly title: string;
  readonly description?: string;
  readonly required: boolean;
  readonly options: readonly QuestionOption[];
  readonly config: Readonly<Record<string, unknown>>;
  readonly validation: Readonly<Record<string, unknown>>;
};

export type CompiledStatementElement = {
  readonly id: ElementId;
  readonly type: "statement";
  readonly title: string;
  readonly description?: string;
};

export type DebugFormViewModel = {
  readonly source: FormSource;
  readonly title: string;
};
