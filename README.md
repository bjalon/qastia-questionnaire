# Qastia Form Runtime

`@bjalon/form-runtime` est une librairie React pour compiler, editer, previsualiser, afficher et collecter les reponses de questionnaires YAML dans une application metier.

L'objectif n'est pas de remplacer un outil de formulaire generaliste. La librairie fournit un runtime embarquable pour des questionnaires structures, themables, editables, versionnables et connectables au stockage applicatif de l'application hote.

## Objectifs

- Decrire un questionnaire dans un format source lisible base sur YAML.
- Compiler ce format en modele type exploitable par une application React.
- Fournir des diagnostics de compilation pour guider l'edition et le debug.
- Afficher un formulaire participant avec navigation, validation et soumission JSON.
- Fournir un designer embarque avec canvas, palette, inspector, YAML et preview.
- Centraliser les types de questions, themes et validateurs dans des registres extensibles.
- Decoupler la collecte des reponses du stockage : la librairie appelle `onSubmit`, l'application hote persiste.
- Preparer l'integration dans `qastia-coaching` sans dependance directe a Firebase ou aux services applicatifs.

## Cas D'Usage

La librairie est pensee pour les applications qui doivent concevoir ou faire remplir des questionnaires dans un workflow metier :

- questionnaires d'entree en accompagnement ;
- evaluation a chaud ou a froid ;
- preparation d'atelier ou de formation ;
- collecte structuree depuis un espace participant ;
- edition par un back-office ou un espace client ;
- preview immediate pendant l'edition ;
- integration d'un payload de reponses dans un service applicatif.

## Installation

Pour un projet qui consomme le package publie sur GitHub Packages :

```ini
@bjalon:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

```bash
npm install @bjalon/form-runtime
```

Pendant le developpement local avec `qastia-coaching`, il est aussi possible d'utiliser une dependance locale :

```json
{
  "dependencies": {
    "@bjalon/form-runtime": "file:../qastia-questionnaire"
  }
}
```

La feuille de style doit etre importee par l'application :

```ts
import "@bjalon/form-runtime/styles.css";
```

## Format Source

Un formulaire est une source YAML. Les pages contiennent des elements. En V1, les elements principaux sont `question` et `statement`.

```yaml
version: 1
kind: form
id: coaching-intake
metadata:
  title: "Questionnaire d'entree"
  description: "Quelques informations pour preparer la session."
  locale: "fr-FR"
theme:
  id: coaching
navigation:
  mode: paged
pages:
  - id: contexte
    title: "Contexte"
    description: "Ces informations qualifient la demande."
    elements:
      - id: intro
        type: statement
        title: "Avant de commencer"
        description: "Les reponses seront transmises a l'application hote via onSubmit."
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
        title: "Role"
        required: true
        options:
          - value: dirigeant
            label: "Dirigeant"
          - value: rh
            label: "RH"
          - value: manager
            label: "Manager"
  - id: evaluation
    title: "Evaluation"
    elements:
      - id: clarity
        type: question
        questionType: linear-scale
        title: "Clarte de la demande"
        required: true
        config:
          min: 1
          max: 5
          minLabel: "A clarifier"
          maxLabel: "Tres clair"
```

`metadata.title` est le titre du questionnaire. Dans `FormDesigner`, il est editable directement par double-clic dans la barre superieure. Le blur ou `Entree` persiste la valeur dans le YAML ; `Echap` annule l'edition.

`navigation.mode` accepte :

- `paged` : navigation page par page ;
- `single-page` : toutes les pages sont rendues ensemble.

## Types De Questions V1

Le runtime par defaut fournit :

- `short-text` : texte court ;
- `long-text` : texte long ;
- `yes-no` : oui / non ;
- `single-choice` : choix unique ;
- `multiple-choice` : choix multiple ;
- `dropdown` : liste deroulante ;
- `number` : nombre ;
- `date` : date ISO ;
- `linear-scale` : echelle numerique ;
- `rating` : note ;
- `statement` : bloc informatif sans reponse.

Les questions a options utilisent :

```yaml
options:
  - value: manager
    label: "Manager"
```

Les validations simples sont portees par `validation`, par exemple `minLength`, `maxLength`, `min`, `max` et `integer`.

## Usage Rapide

Designer controle par l'application :

```tsx
import { useState } from "react";
import {
  FormDesigner,
  defaultFormRuntime,
  type FormSource,
} from "@bjalon/form-runtime";
import "@bjalon/form-runtime/styles.css";

const initialSource: FormSource = {
  uri: "local://questionnaire.yml",
  content: `
version: 1
kind: form
metadata:
  title: "Questionnaire"
pages:
  - id: page_1
    title: "Page 1"
    elements: []
`,
};

export function QuestionnaireDesigner(): React.ReactElement {
  const [source, setSource] = useState(initialSource);

  return (
    <FormDesigner
      source={source}
      runtime={defaultFormRuntime}
      actions={
        <button type="button" onClick={() => setSource(initialSource)}>
          Reinitialiser
        </button>
      }
      onSourceChange={(event) => setSource(event.source)}
    />
  );
}
```

Runner participant :

```tsx
import {
  FormRunner,
  compileForm,
  defaultFormRuntime,
  type FormSource,
} from "@bjalon/form-runtime";
import "@bjalon/form-runtime/styles.css";

export function ParticipantForm({ source }: { readonly source: FormSource }): React.ReactElement {
  const result = compileForm(source, defaultFormRuntime, { mode: "strict" });

  if (result.status === "invalid") {
    return <p>Formulaire invalide.</p>;
  }

  return (
    <FormRunner
      form={result.form}
      runtime={defaultFormRuntime}
      onSubmit={(event) => {
        console.log(event.payload);
      }}
    />
  );
}
```

Preview depuis un resultat de compilation :

```tsx
import { FormPreview, compileForm } from "@bjalon/form-runtime";

const result = compileForm(source);

export function Preview(): React.ReactElement {
  return <FormPreview result={result} showHeaderTitle={false} />;
}
```

## Composants Principaux

- `FormDesigner` : facade d'edition embarquee.
- `FormPreview` : preview participant avec diagnostics et JSON simule.
- `FormRunner` : rendu participant et collecte des reponses.
- `DebugFormFallback` : fallback quand la source est invalide.
- `compileForm` : compilation YAML vers un modele type.
- `createFormRuntime` : runtime personnalise avec questions, themes et validateurs.
- `buildSubmitPayload` : construction du payload JSON.
- `validateAndBuildSubmitPayload` : validation complete puis construction du payload.

## FormDesigner

`FormDesigner` regroupe :

- titre du questionnaire editable par double-clic ;
- actions injectables par l'application hote ;
- menu de modes `Formulaire`, `YAML`, `Preview` ;
- diagnostics de compilation ;
- canvas pages/questions ;
- palette de questions a droite ;
- inspector formulaire/page/question ;
- edition YAML brute ;
- preview participant.

### Interactions Disponibles

- Double-clic sur le titre : edition de `metadata.title`.
- Blur ou `Entree` sur ce titre : sauvegarde.
- `Echap` sur ce titre : annulation.
- Clic sur une page ou une question : selection dans le canvas.
- Palette : ajout d'une question apres la selection courante, ou a la fin de la page active.
- Palette `Saut de page` : ajoute une page apres la page selectionnee.
- Inspector : edition du titre, de la description, du caractere obligatoire et des options.
- Mode YAML : edition directe de la source.
- Mode Preview : test du formulaire participant et affichage du JSON.

### Actions Injectables

L'application hote peut fournir ses propres boutons dans la topbar du designer :

```tsx
<FormDesigner
  source={source}
  actions={
    <>
      <button type="button" onClick={saveDraft}>
        Sauvegarder
      </button>
      <button type="button" onClick={resetSource}>
        Reinitialiser
      </button>
    </>
  }
  onSourceChange={(event) => setSource(event.source)}
/>
```

Ces actions restent applicatives. La librairie ne decide pas comment sauvegarder, publier ou persister le formulaire.

### Props Publiques

Props principales de `FormDesigner` :

```ts
type FormDesignerProps = {
  source?: FormSource;
  defaultSource?: FormSource;
  runtime?: FormRuntime;
  actions?: React.ReactNode;
  storage?: false | FormDesignerPersistenceAdapter;
  storageKey?: string;
  selection?: FormDesignerSelection;
  defaultSelection?: FormDesignerSelection;
  options?: Partial<FormDesignerOptions>;
  onSourceChange?: (event: FormSourceChangeEvent) => void;
  onSelectionChange?: (selection: FormDesignerSelection) => void;
  onCompile?: (result: CompileFormResult) => void;
};
```

Options publiques :

```ts
type FormDesignerOptions = {
  showDiagnostics: boolean;
  defaultViewMode: "form" | "yaml" | "preview";
  viewModes: readonly ("form" | "yaml" | "preview")[];
};
```

La selection peut etre controlee par l'application :

```tsx
<FormDesigner
  source={source}
  selection={selection}
  onSelectionChange={setSelection}
  onSourceChange={(event) => setSource(event.source)}
/>
```

### Stockage Decouple

Le stockage du designer passe par un adapter independant de React. L'application peut donc brancher `localStorage`, une API REST, Firebase ou tout autre backend sans que la librairie connaisse ce stockage.

Adapter local fourni :

```tsx
import {
  FormDesigner,
  LocalStorageFormDesignerPersistenceAdapter,
} from "@bjalon/form-runtime";

const storage = new LocalStorageFormDesignerPersistenceAdapter({
  namespace: "qastia-coaching:form-drafts",
});

<FormDesigner
  defaultSource={initialSource}
  storage={storage}
  storageKey="client-session-intake"
  onSourceChange={(event) => console.log(event.reason)}
/>;
```

L'adapter public expose seulement :

- `loadDraft(key)` ;
- `saveDraft(snapshot)` ;
- `clearDraft(key)`.

Le type `FormDesignerPersistenceAdapter` est exporte pour brancher un stockage applicatif.

## FormRunner

`FormRunner` affiche un formulaire compile sans dependre du designer.

```tsx
<FormRunner
  form={compiledForm}
  defaultAnswers={{ full_name: "Sophie" }}
  onAnswersChange={(answers) => setDraftAnswers(answers)}
  onSubmit={(event) => {
    persistAnswers(event.payload);
  }}
/>
```

Le runner supporte :

- navigation `paged` ou `single-page` ;
- mode controle avec `answers` ;
- mode non controle avec `defaultAnswers` ;
- validation des questions obligatoires ;
- validation par type de question ;
- focus sur la premiere erreur ;
- soumission uniquement si la validation passe.

Props principales de `FormRunner` :

```ts
type FormRunnerProps = {
  form: CompiledForm;
  runtime?: FormRuntime;
  answers?: FormAnswers;
  defaultAnswers?: FormAnswers;
  viewMode?: "participant" | "preview";
  onAnswersChange?: (answers: FormAnswers) => void;
  onSubmit?: (event: FormSubmitEvent) => void;
};
```

Props principales de `FormPreview` :

```ts
type FormPreviewProps = {
  result: CompileFormResult;
  runtime?: FormRuntime;
  showDiagnostics?: boolean;
  showHeader?: boolean;
  showHeaderTitle?: boolean;
};
```

## Payload De Reponses

`onSubmit` recoit un payload stable et versionne par le formulaire compile.

```json
{
  "form": {
    "id": "coaching-intake",
    "title": "Questionnaire d'entree",
    "version": 1,
    "sourceHash": "fnv1a:..."
  },
  "submittedAt": "2026-05-03T20:00:00.000Z",
  "answers": {
    "full_name": "Sophie",
    "clarity": 4
  },
  "pages": [
    {
      "id": "contexte",
      "title": "Contexte",
      "answers": {
        "full_name": "Sophie"
      }
    }
  ]
}
```

Les questions optionnelles sans reponse sont omises du payload. Les questions obligatoires manquantes produisent une erreur de validation et `onSubmit` n'est pas appele.

## Compilation Et Diagnostics

`compileForm` est independant de React. Il peut etre utilise cote client, cote serveur, dans des tests ou dans un pipeline de validation.

Modes disponibles :

```ts
compileForm(source, runtime, { mode: "authoring" });
compileForm(source, runtime, { mode: "strict" });
```

- `authoring` : permet de continuer avec un modele `degraded` quand le designer peut encore rendre quelque chose.
- `strict` : refuse les erreurs structurelles, les champs inconnus, les valeurs invalides, les themes inconnus et les modes de navigation invalides.

Les diagnostics contiennent :

- `code` ;
- `severity` ;
- `message` ;
- `path` YAML logique ;
- `range` avec ligne/colonne quand localisable ;
- `pageId` et `elementId` quand disponibles ;
- `hint` de correction.

Le helper `rangeForPath` est exporte depuis `@bjalon/form-runtime/compiler` pour localiser un chemin YAML dans une source.

## Runtime Personnalise

Le runtime par defaut contient les types de questions, themes et validateurs fournis par la librairie. Une application peut ajouter ou remplacer ces registres :

```tsx
import { createFormRuntime } from "@bjalon/form-runtime/runtime";

const runtime = createFormRuntime({
  questionTypes: [...customQuestionTypes],
  themes: [...customThemes],
  validators: [...customValidators],
  collisionStrategy: "override",
});
```

Strategies disponibles en cas de collision de registre :

- `override` : le dernier element remplace le precedent ;
- `keep-first` : le premier element est conserve ;
- `error` : une erreur est levee des qu'un doublon est detecte.

## Themes

Les themes impactent uniquement le rendu du formulaire, pas l'application hote. Les presets actuels sont declares dans le runtime par defaut et appliques par variables CSS.

Themes fournis :

- `qastia-light` ;
- `coaching`.

Le YAML reference le theme via :

```yaml
theme:
  id: coaching
```

## Entrypoints

Le package expose des entrypoints separes pour limiter ce qu'une application importe :

```ts
import { FormDesigner } from "@bjalon/form-runtime/designer";
import { FormPreview } from "@bjalon/form-runtime/preview";
import { FormRunner } from "@bjalon/form-runtime/runner";
import { compileForm, rangeForPath } from "@bjalon/form-runtime/compiler";
import { createFormRuntime } from "@bjalon/form-runtime/runtime";
import { LocalStorageFormDesignerPersistenceAdapter } from "@bjalon/form-runtime/storage";
import "@bjalon/form-runtime/styles.css";
```

L'entree racine reste disponible pour un usage simple :

```ts
import { FormDesigner, FormRunner, compileForm } from "@bjalon/form-runtime";
```

## Exemple Integre

L'exemple montre une integration typique dans une page applicative :

- `FormDesigner` controle sur une source YAML ;
- action applicative `Reinitialiser` injectee dans la topbar ;
- edition du titre par double-clic ;
- ajout de pages et questions depuis la palette ;
- edition via inspector ;
- mode YAML ;
- mode preview participant ;
- diagnostics et JSON de soumission.

Lancement local :

```bash
npm install
npm run dev:example
```

## Build Et Tests

```bash
npm install
npm run build
```

Commandes utiles :

```bash
npm run typecheck
npm test
npm run test:package
npm run build:example
npm pack --dry-run
```

`npm run test:package` reconstruit la librairie, teste les entrypoints publics `@bjalon/form-runtime/*`, verifie qu'un deep import interne est refuse, puis compile une mini app Vite consommateur basee sur `runner`, `compiler` et `runtime`.

## Publication GitHub Packages

Le package est publie sous le scope npm `@bjalon`, car le repository GitHub cible est `bjalon/qastia-questionnaire`.

GitHub Packages npm impose que le scope du package corresponde au proprietaire GitHub autorise. Le workflow publie donc `@bjalon/form-runtime` avec `secrets.GITHUB_TOKEN` et la permission Actions `packages: write`.

Configuration cote consommateur :

```ini
@bjalon:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Dependance publiee :

```json
{
  "dependencies": {
    "@bjalon/form-runtime": "^0.1.0"
  }
}
```

Pour publier une version depuis GitHub Actions :

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Documentation D'Architecture

Les documents de reference sont dans `documents/` :

- `spec-qastia-form-runtime.md` : specification technique et principes d'architecture ;
- `lots-implementation-qastia-form-runtime.md` : decoupage par lots d'implementation.
- `evolutions-post-v1.md` : evolutions volontairement gardees hors du socle V1.
