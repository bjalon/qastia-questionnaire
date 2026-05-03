import type {
  FormDesignerDraftSnapshot,
  FormDesignerPersistenceAdapter,
} from "../domain/Storage";

export type FormDesignerStorageLike = {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
};

export type LocalStorageFormDesignerPersistenceAdapterOptions = {
  readonly namespace?: string;
  readonly storage?: FormDesignerStorageLike;
};

export class LocalStorageFormDesignerPersistenceAdapter implements FormDesignerPersistenceAdapter {
  private readonly namespace: string;
  private readonly storage: FormDesignerStorageLike | null;

  constructor(options: LocalStorageFormDesignerPersistenceAdapterOptions = {}) {
    this.namespace = options.namespace ?? "qastia-form-runtime:draft";
    this.storage = options.storage ?? resolveBrowserStorage();
  }

  async loadDraft(key: string): Promise<FormDesignerDraftSnapshot | null> {
    const storedValue = this.storage?.getItem(this.storageKey(key));
    if (!storedValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(storedValue) as Partial<FormDesignerDraftSnapshot>;
      if (parsed.apiVersion !== 1 || !parsed.source || typeof parsed.updatedAt !== "string") {
        return null;
      }

      return {
        key,
        source: parsed.source,
        updatedAt: parsed.updatedAt,
        apiVersion: 1,
      };
    } catch {
      return null;
    }
  }

  async saveDraft(snapshot: FormDesignerDraftSnapshot): Promise<void> {
    this.storage?.setItem(this.storageKey(snapshot.key), JSON.stringify(snapshot));
  }

  async clearDraft(key: string): Promise<void> {
    this.storage?.removeItem(this.storageKey(key));
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
}

function resolveBrowserStorage(): FormDesignerStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}
