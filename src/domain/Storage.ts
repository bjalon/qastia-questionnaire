import type { FormSource } from "./Form";

export type FormDesignerDraftSnapshot = {
  readonly key: string;
  readonly source: FormSource;
  readonly updatedAt: string;
  readonly apiVersion: 1;
};

export type FormDesignerPersistenceAdapter = {
  readonly loadDraft: (key: string) => Promise<FormDesignerDraftSnapshot | null>;
  readonly saveDraft: (snapshot: FormDesignerDraftSnapshot) => Promise<void>;
  readonly clearDraft: (key: string) => Promise<void>;
};
