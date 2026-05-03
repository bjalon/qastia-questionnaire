import { useEffect, useState } from "react";
import type React from "react";
import { FORM_RUNTIME_PUBLIC_API_VERSION } from "../../domain/PublicApi";
import type {
  FormDesignerPersistenceAdapter,
  FormDesignerVersionSnapshot,
  FormSource,
} from "../../publicTypes";

export type VersionHistoryPanelProps = {
  readonly storage: FormDesignerPersistenceAdapter;
  readonly storageKey: string;
  readonly source: FormSource;
  readonly onRestore: (source: FormSource) => void;
};

export function VersionHistoryPanel({
  storage,
  storageKey,
  source,
  onRestore,
}: VersionHistoryPanelProps): React.ReactElement {
  const [versions, setVersions] = useState<readonly FormDesignerVersionSnapshot[]>([]);

  useEffect(() => {
    void refresh();
  }, [storage, storageKey]);

  async function refresh(): Promise<void> {
    setVersions(await storage.listVersions(storageKey));
  }

  async function saveVersion(): Promise<void> {
    await storage.saveVersion({
      id: `version_${Date.now()}`,
      key: storageKey,
      source,
      createdAt: new Date().toISOString(),
      label: "Version manuelle",
      apiVersion: FORM_RUNTIME_PUBLIC_API_VERSION,
    });
    await refresh();
  }

  async function deleteVersion(versionId: string): Promise<void> {
    await storage.deleteVersion(storageKey, versionId);
    await refresh();
  }

  return (
    <section className="qf-designer-panel qf-version-panel">
      <header>
        <h2>Versions</h2>
        <button type="button" onClick={() => void saveVersion()}>
          Sauver
        </button>
      </header>
      {versions.length === 0 ? (
        <p>Aucune version locale.</p>
      ) : (
        <ul>
          {versions.map((version) => (
            <li key={version.id}>
              <div>
                <strong>{version.label}</strong>
                <span>{new Date(version.createdAt).toLocaleString("fr-FR")}</span>
              </div>
              <button type="button" onClick={() => onRestore(version.source)}>
                Restaurer
              </button>
              <button type="button" onClick={() => void deleteVersion(version.id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
