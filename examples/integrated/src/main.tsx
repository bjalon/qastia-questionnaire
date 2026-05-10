import { Component, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  createRepository,
  defineGraph,
  inMemoryPersistence,
  singleton,
  zodSchema,
  type ObjectVcsTypedRepository,
  type PersistenceAdapter,
} from "@bjalon/object-vcs-core";
import { z } from "zod";
import {
  FormDesigner,
  LocalStorageFormDesignerPersistenceAdapter,
  defaultFormRuntime,
  type FormDesignerDraftSnapshot,
  type FormDesignerPersistenceAdapter,
  type FormDesignerVersionSnapshot,
  type FormSource,
} from "../../../src";
import "../../../src/styles/form-runtime.css";
import "./styles.css";

const initialSource: FormSource = {
  uri: "local://qastia-form-integrated-example.yml",
  content: `version: 1
kind: form
id: coaching-intake
metadata:
  title: "Questionnaire d'entrée en accompagnement"
  description: "Quelques informations pour préparer une session Qastia Coaching."
  locale: "fr-FR"
theme:
  id: coaching
navigation:
  mode: paged
pages:
  - id: contexte
    title: "Contexte"
    description: "Ces informations qualifient la demande sans dépendre du stockage hôte."
    elements:
      - id: intro
        type: statement
        title: "Avant de commencer"
        description: "Les réponses seront transmises à l'application hôte via onSubmit."
      - id: full_name
        type: question
        questionType: short-text
        title: "Nom complet"
        required: true
        validation:
          minLength: 2
          maxLength: 100
      - id: role
        type: question
        questionType: dropdown
        title: "Rôle"
        required: true
        options:
          - value: dirigeant
            label: "Dirigeant"
          - value: rh
            label: "RH"
          - value: manager
            label: "Manager"
          - value: collaborateur
            label: "Collaborateur"
      - id: participant_count
        type: question
        questionType: number
        title: "Nombre de participants concernés"
        required: true
        validation:
          min: 1
          max: 250
          integer: true
  - id: besoins
    title: "Besoins"
    description: "Les questions à options produisent un JSON stable."
    elements:
      - id: themes
        type: question
        questionType: multiple-choice
        title: "Sujets à traiter"
        required: true
        options:
          - value: prevention
            label: "Prévention"
          - value: conflits
            label: "Conflits"
          - value: harcelement
            label: "Harcèlement"
          - value: management
            label: "Management"
      - id: urgency
        type: question
        questionType: single-choice
        title: "Niveau d'urgence"
        required: true
        options:
          - value: faible
            label: "Faible"
          - value: moyen
            label: "Moyen"
          - value: eleve
            label: "Élevé"
      - id: preferred_date
        type: question
        questionType: date
        title: "Date souhaitée"
      - id: consent
        type: question
        questionType: yes-no
        title: "Acceptez-vous d'être recontacté ?"
        required: true
  - id: evaluation
    title: "Évaluation"
    elements:
      - id: clarity
        type: question
        questionType: linear-scale
        title: "Clarté de la demande"
        required: true
        config:
          min: 1
          max: 5
          minLabel: "À clarifier"
          maxLabel: "Très clair"
      - id: confidence
        type: question
        questionType: rating
        title: "Niveau de confiance dans le dispositif"
        config:
          max: 5
      - id: details
        type: question
        questionType: long-text
        title: "Informations complémentaires"
        validation:
          maxLength: 2000
`,
};

const storage = new LocalStorageFormDesignerPersistenceAdapter({
  namespace: "qastia-form-runtime:integrated-example",
});

type StorageMode = "standard" | "gitlight";

function IntegratedExample(): React.ReactElement {
  const [source, setSource] = useState<FormSource>(initialSource);
  const [storageMode, setStorageMode] = useState<StorageMode>("standard");
  const activeStorage = storageMode === "standard" ? storage : gitlightStorage;

  return (
    <main className="example-shell">
      <header className="example-toolbar">
        <div>
          <p>Stockage du designer</p>
          <h1>{storageMode === "standard" ? "Standard localStorage" : "Gitlight Object VCS"}</h1>
        </div>
        <div className="storage-switch" role="group" aria-label="Stockage du designer">
          <button
            type="button"
            aria-pressed={storageMode === "standard"}
            onClick={() => setStorageMode("standard")}
          >
            Standard
          </button>
          <button
            type="button"
            aria-pressed={storageMode === "gitlight"}
            onClick={() => setStorageMode("gitlight")}
          >
            Gitlight
          </button>
        </div>
      </header>
      <section className="designer-example">
        <FormDesigner
          source={source}
          runtime={defaultFormRuntime}
          storage={activeStorage}
          storageKey="coaching-intake"
          actions={
            <button type="button" onClick={() => setSource(initialSource)}>
              Réinitialiser
            </button>
          }
          onSourceChange={(event) => setSource(event.source)}
          options={{ showDiagnostics: true, autoSaveValidVersions: storageMode === "standard" }}
        />
      </section>
    </main>
  );
}

const FormSourceSchema = z.object({
  uri: z.string().optional(),
  content: z.string(),
});

const GitlightDesignerStateSchema = z.object({
  draft: FormSourceSchema,
});

type GitlightDesignerState = z.infer<typeof GitlightDesignerStateSchema>;

const gitlightDesignerGraph = defineGraph({
  draft: singleton(zodSchema(FormSourceSchema)),
});

const gitlightPersistence = inMemoryPersistence<GitlightDesignerState>();
const gitlightVersionTagPrefix = "form-version:";

class GitlightFormDesignerPersistenceAdapter implements FormDesignerPersistenceAdapter {
  private readonly repositories = new Map<string, ObjectVcsTypedRepository<typeof gitlightDesignerGraph>>();
  private readonly persistence: PersistenceAdapter<GitlightDesignerState>;

  constructor(persistence: PersistenceAdapter<GitlightDesignerState> = gitlightPersistence) {
    this.persistence = persistence;
  }

  async loadDraft(key: string): Promise<FormDesignerDraftSnapshot | null> {
    const repository = this.repository(key);
    try {
      const head = await repository.getHead();
      return {
        key,
        source: head.state.draft,
        updatedAt: head.updatedAt,
        apiVersion: 1,
      };
    } catch {
      return null;
    }
  }

  async saveDraft(snapshot: FormDesignerDraftSnapshot): Promise<void> {
    const repository = this.repository(snapshot.key);
    if (await this.isInitialized(repository)) {
      await repository.update(() => ({ draft: snapshot.source }), { commit: false });
      return;
    }

    await repository.init({
      initialState: { draft: snapshot.source },
      commit: false,
      message: "Brouillon initial",
    });
  }

  async clearDraft(key: string): Promise<void> {
    const repository = this.repository(key);
    try {
      const head = await repository.getHead();
      if (head.status === "dirty" && head.headRevision !== null) {
        await repository.resetBranch("main", { mode: "hard", to: head.headRevision });
      }
    } catch {
      // A missing repository means there is no draft to clear.
    }
  }

  async listVersions(key: string): Promise<readonly FormDesignerVersionSnapshot[]> {
    const repository = this.repository(key);
    try {
      const tags = await repository.listTags();
      const versions = await Promise.all(
        tags
          .filter((tag) => tag.name.startsWith(gitlightVersionTagPrefix))
          .map(async (tag) => {
            const metadata = parseVersionTagAnnotation(tag.annotation);
            const state = await repository.readRevision(tag.revision);
            return {
              id: tag.name.slice(gitlightVersionTagPrefix.length),
              key,
              source: state.draft,
              createdAt: metadata.createdAt ?? tag.createdAt,
              label: metadata.label ?? `Revision ${tag.revision}`,
              apiVersion: 1 as const,
            };
          }),
      );
      return versions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    } catch {
      return [];
    }
  }

  async saveVersion(snapshot: FormDesignerVersionSnapshot): Promise<void> {
    const repository = this.repository(snapshot.key);
    if (!(await this.isInitialized(repository))) {
      await repository.init({
        initialState: { draft: snapshot.source },
        commit: true,
        message: snapshot.label,
      });
    } else {
      await repository.update(() => ({ draft: snapshot.source }), { commit: false });
      await repository.commit({ allowEmpty: true, message: snapshot.label });
    }

    const head = await repository.getHead();
    if (head.headRevision === null) {
      return;
    }
    await repository.tag(versionTagName(snapshot.id), {
      annotation: JSON.stringify({
        label: snapshot.label,
        createdAt: snapshot.createdAt,
      }),
      overwrite: true,
      revision: head.headRevision,
    });
  }

  async deleteVersion(key: string, versionId: string): Promise<void> {
    const repository = this.repository(key);
    try {
      await repository.deleteTag(versionTagName(versionId), { missing: "ignore" });
    } catch {
      // A missing repository or tag is already equivalent to a deleted visible version.
    }
  }

  private repository(key: string): ObjectVcsTypedRepository<typeof gitlightDesignerGraph> {
    const existingRepository = this.repositories.get(key);
    if (existingRepository) {
      return existingRepository;
    }

    const repository = createRepository({
      repoId: `qastia-form-example:${key}`,
      graph: gitlightDesignerGraph,
      schemaVersion: 1,
      graphVersion: "qastia-form-source@1",
      schemaFingerprint: "manual:qastia-form-source@1",
      schemaFingerprintAlgorithm: "manual",
      defaultBranch: "main",
      persistence: this.persistence,
    });
    this.repositories.set(key, repository);
    return repository;
  }

  private async isInitialized(
    repository: ObjectVcsTypedRepository<typeof gitlightDesignerGraph>,
  ): Promise<boolean> {
    try {
      await repository.getHead();
      return true;
    } catch {
      return false;
    }
  }
}

function versionTagName(versionId: string): string {
  return `${gitlightVersionTagPrefix}${versionId}`;
}

function parseVersionTagAnnotation(annotation: string | undefined): { readonly label?: string; readonly createdAt?: string } {
  if (!annotation) {
    return {};
  }
  try {
    const parsed = JSON.parse(annotation) as Partial<{ readonly label: string; readonly createdAt: string }>;
    return {
      label: typeof parsed.label === "string" ? parsed.label : undefined,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : undefined,
    };
  } catch {
    return {};
  }
}

const gitlightStorage = new GitlightFormDesignerPersistenceAdapter();

type ErrorBoundaryState = {
  readonly error: Error | null;
};

class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  readonly state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="example-shell">
          <section className="runtime-error">
            <h1>Erreur de rendu</h1>
            <pre>{this.state.error.message}</pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <ErrorBoundary>
    <IntegratedExample />
  </ErrorBoundary>,
);
