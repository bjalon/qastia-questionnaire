import type {
  FormDesignerDraftSnapshot,
  FormDesignerPersistenceAdapter,
  FormDesignerVersionSnapshot,
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

  async listVersions(key: string): Promise<readonly FormDesignerVersionSnapshot[]> {
    const storedValue = this.storage?.getItem(this.versionsKey(key));
    if (!storedValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedValue) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isVersionSnapshot).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    } catch {
      return [];
    }
  }

  async saveVersion(snapshot: FormDesignerVersionSnapshot): Promise<void> {
    const versions = (await this.listVersions(snapshot.key)).filter((version) => version.id !== snapshot.id);
    this.storage?.setItem(this.versionsKey(snapshot.key), JSON.stringify([snapshot, ...versions].slice(0, 40)));
  }

  async deleteVersion(key: string, versionId: string): Promise<void> {
    const versions = (await this.listVersions(key)).filter((version) => version.id !== versionId);
    this.storage?.setItem(this.versionsKey(key), JSON.stringify(versions));
  }

  private storageKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private versionsKey(key: string): string {
    return `${this.namespace}:versions:${key}`;
  }
}

function isVersionSnapshot(value: unknown): value is FormDesignerVersionSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<FormDesignerVersionSnapshot>;
  return (
    typeof record.id === "string" &&
    typeof record.key === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.label === "string" &&
    record.apiVersion === 1 &&
    typeof record.source?.content === "string"
  );
}

function resolveBrowserStorage(): FormDesignerStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}
