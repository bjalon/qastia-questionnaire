# Spécification technique — `@bjalon/form-runtime`

## 1. Objectif

`@bjalon/form-runtime` est une librairie React/TypeScript permettant de concevoir, valider, prévisualiser, exécuter et collecter les réponses d’un questionnaire décrit en YAML.

L’objectif est de proposer une expérience proche d’un éditeur de formulaire moderne, dans l’esprit de Google Forms, mais avec un modèle source textuel, versionnable et compilable.

La librairie doit permettre :

- de décrire un questionnaire en YAML ;
- de compiler cette source YAML en modèle typé ;
- de détecter finement les erreurs de composition ;
- d’assister l’utilisateur pendant le design avec diagnostics localisés ;
- de rendre un formulaire final utilisable par un participant ;
- de prévisualiser le rendu pendant l’édition ;
- de produire un JSON structuré contenant les réponses ;
- d’appeler un callback applicatif pour le stockage des réponses ;
- d’être intégrée simplement dans une application React/Vite ;
- d’être extensible : nouveaux types de questions, nouveaux thèmes, nouveaux renderers, nouvelles règles de validation.

Le projet doit reprendre les exigences architecturales déjà posées pour `@bjalon/deck-runtime`(/home/bjalon/projects/qastia/qastia-deck) :

- séparation claire entre source, compilation, rendu et édition ;
- compilateur indépendant de React ;
- validation stricte ;
- diagnostics riches ;
- mode designer avec erreurs localisées ;
- modèle public stable ;
- composants React composables ;
- stockage découplé de React ;
- logique extensible via runtime registries ;
- structure de répertoire qui guide naturellement le développeur.

---

## 2. Nom 

Nom de package :

```txt
@bjalon/form-runtime
```

car elle ne doit pas seulement designer des formulaires. Elle doit aussi les compiler, les prévisualiser, les rendre et collecter les réponses.

---

## 3. Flux général

```txt
FormSource YAML
   ↓
compileForm()
   ↓
CompileFormResult
   ↓
CompiledForm
   ↓
FormDesigner / FormPreview / FormRunner / DebugFormFallback
   ↓
FormAnswers JSON
   ↓
onSubmit callback / stockage applicatif
```

Le formulaire final intégré dans une application ne stocke pas directement les réponses, sauf si l’app hôte lui fournit un adapter ou un callback. Par défaut, il produit un objet JSON typé.

---

## 4. Principes d’architecture

### 4.1. Séparation des responsabilités

```txt
compiler     → parse, valide, normalise, compile
runtime      → fournit les registres : questions, thèmes, renderers, validators
designer     → éditeur visuel de questionnaire
runner       → rendu participant / collecte des réponses
preview      → prévisualisation pendant le design
debug        → fallback source + diagnostics
storage      → sauvegarde locale optionnelle des versions de design
themes       → styles des formulaires et questions
```

### 4.2. Règles structurantes

1. `compileForm` ne dépend pas de React.
2. `FormRunner` ne dépend pas du designer.
3. `FormDesigner` peut utiliser `FormPreview`, mais `FormPreview` ne dépend pas du designer.
4. Les types de questions sont déclarés via un registry.
5. Les questions définissent leur rendu, leur configuration d’édition, leur validation et leur sérialisation.
6. La persistance locale du questionnaire designé passe par adapter.
7. La collecte des réponses passe par callback ou adapter fourni par l’app hôte.
8. Les erreurs utilisateur deviennent des diagnostics, pas des exceptions.
9. Les exceptions sont réservées aux bugs internes ou erreurs système non récupérables.
10. Les composants publics doivent pouvoir être utilisés en mode contrôlé ou non contrôlé.
11. Le thème impacte uniquement le formulaire rendu, pas l’éditeur hôte, sauf option explicite.
12. Le YAML reste la source persistable et versionnable du questionnaire.
13. Le modèle compilé est le seul modèle consommé par les renderers.
14. Le JSON de réponses est stable et versionné.
15. Les pages sont des conteneurs explicites de questions, pas de simples séparateurs visuels.

---

## 5. Structure de dossier recommandée

```txt
src/
  compiler/
    compileForm.ts
    parseFormSource.ts
    presets/
      qualiopiSubjectProgress.ts
    validateFormSchema.ts
    normalizeForm.ts
    validateFormSemantics.ts
    compilePage.ts
    compileElement.ts
    compileQuestion.ts
    compileRules.ts
    diagnostics.ts
    sourceMap/
      SourceRange.ts
      yamlRanges.ts

  runtime/
    createFormRuntime.ts
    defaultFormRuntime.ts
    defaultQuestionTypes.ts
    defaultThemes.ts
    defaultValidators.ts
    defaultRenderers.ts

  domain/
    Form.ts
    Page.ts
    Element.ts
    Question.ts
    QuestionType.ts
    Answer.ts
    Theme.ts
    Diagnostic.ts
    Runtime.ts
    Result.ts
    Events.ts
    assertNever.ts

  schema/
    rawForm.schema.ts
    rawPage.schema.ts
    rawElement.schema.ts
    rawQuestion.schema.ts
    rawRules.schema.ts
    rawTheme.schema.ts

  questionTypes/
    registry.ts
    QuestionTypeDefinition.ts

    shortText/
      shortText.definition.ts
      ShortTextQuestionRenderer.tsx
      ShortTextQuestionEditor.tsx

    longText/
      longText.definition.ts
      LongTextQuestionRenderer.tsx
      LongTextQuestionEditor.tsx

    yesNo/
      yesNo.definition.ts
      YesNoQuestionRenderer.tsx
      YesNoQuestionEditor.tsx

    singleChoice/
      singleChoice.definition.ts
      SingleChoiceQuestionRenderer.tsx
      SingleChoiceQuestionEditor.tsx

    multipleChoice/
      multipleChoice.definition.ts
      MultipleChoiceQuestionRenderer.tsx
      MultipleChoiceQuestionEditor.tsx

    dropdown/
      dropdown.definition.ts
      DropdownQuestionRenderer.tsx
      DropdownQuestionEditor.tsx

    number/
      number.definition.ts
      NumberQuestionRenderer.tsx
      NumberQuestionEditor.tsx

    date/
      date.definition.ts
      DateQuestionRenderer.tsx
      DateQuestionEditor.tsx

    linearScale/
      linearScale.definition.ts
      LinearScaleQuestionRenderer.tsx
      LinearScaleQuestionEditor.tsx

    rating/
      rating.definition.ts
      RatingQuestionRenderer.tsx
      RatingQuestionEditor.tsx

    statement/
      statement.definition.ts
      StatementRenderer.tsx
      StatementEditor.tsx

  runner/
    index.ts
    FormRunner.tsx
    FormPageRenderer.tsx
    FormElementRenderer.tsx
    QuestionRenderer.tsx
    FormNavigation.tsx
    FormProgress.tsx
    useFormSession.ts
    useFormAnswers.ts
    validateAnswers.ts
    submitForm.ts

  preview/
    index.ts
    FormPreview.tsx
    PreviewToolbar.tsx

  designer/
    index.ts
    FormDesigner.tsx
    defaultDesignerOptions.ts
    state/
      useFormDesignerState.ts
      formDesignerReducer.ts
      formDesignerActions.ts
    canvas/
      DesignerCanvas.tsx
      PageBlock.tsx
      ElementBlock.tsx
      QuestionBlock.tsx
      EmptyPageDropZone.tsx
    palette/
      QuestionPalette.tsx
      PaletteItem.tsx
    inspector/
      FormInspector.tsx
      PageInspector.tsx
      QuestionInspector.tsx
    sourceMode/
      FormYamlEditor.tsx
    diagnostics/
      DiagnosticsPanel.tsx
      diagnosticsToCodeMirror.ts
      DiagnosticTooltip.tsx
    preview/
      DesignerPreviewPane.tsx
    versions/
      VersionHistoryPanel.tsx
      RecoveryDialog.tsx

  storage/
    FormDesignerPersistenceAdapter.ts
    LocalStorageFormDesignerPersistenceAdapter.ts
    versionKeys.ts
    recovery.ts

  debug/
    DebugFormFallback.tsx

  themes/
    ThemeRegistry.ts
    defaultTheme.ts
    themeTokens.ts
    formThemeApplication.ts

  styles/
    form-runtime.css
    base.css
    runner.css
    designer.css
    questions.css
    themes.css
    debug.css

  publicTypes.ts
  index.ts
```

---

## 6. Modèle YAML

### 6.1. Exemple minimal

```yaml
version: 1
kind: form

metadata:
  title: "Questionnaire de satisfaction"
  description: "Merci de prendre quelques minutes pour répondre."
  locale: "fr-FR"

theme:
  id: qastia-light

pages:
  - id: introduction
    title: "Introduction"
    description: "Quelques questions pour mieux comprendre votre retour."
    elements:
      - id: full_name
        type: question
        questionType: short-text
        title: "Votre nom"
        description: "Indiquez votre nom complet."
        required: true

      - id: satisfied
        type: question
        questionType: yes-no
        title: "Êtes-vous satisfait de la formation ?"
        required: true

  - id: details
    title: "Détails"
    description: "Vos réponses nous aident à améliorer les prochaines sessions."
    elements:
      - id: rating
        type: question
        questionType: linear-scale
        title: "Quelle note globale donnez-vous ?"
        required: true
        config:
          min: 1
          max: 5
          minLabel: "Très insatisfait"
          maxLabel: "Très satisfait"

      - id: comments
        type: question
        questionType: long-text
        title: "Commentaires libres"
        required: false
```

### 6.2. Philosophie du YAML

Le YAML doit être lisible, mais strict :

- les champs inconnus sont refusés ;
- les `id` doivent être uniques ;
- les types de questions doivent exister dans le runtime ;
- les options spécifiques à chaque question sont validées par le type de question ;
- les pages doivent contenir au moins un élément, sauf en mode design ;
- les questions peuvent être marquées obligatoires ;
- les descriptions sont optionnelles ;
- les validations sont explicites.

### 6.3. Pages

Chaque question est contenue dans une page.

```yaml
pages:
  - id: page_1
    title: "Informations générales"
    description: "Cette page rassemble les informations de base."
    elements: []
```

Une page peut contenir :

- une question ;
- un bloc de texte informatif ;
- un séparateur visuel ;
- éventuellement, plus tard, un bloc média ou une logique conditionnelle.

Le “saut de page” dans l’éditeur correspond à l’ajout d’une nouvelle entrée dans `pages`.

### 6.4. Éléments

Un élément de page peut être :

```yaml
type: question
```

ou :

```yaml
type: statement
```

ou plus tard :

```yaml
type: media
type: separator
```

Pour la V1, les deux types recommandés sont :

```txt
question
statement
```

`statement` permet d’ajouter un texte explicatif sans réponse attendue.

### 6.5. Preset Qualiopi par sujets

En complément du modèle `kind: form`, le compilateur accepte un modèle source
simplifié pour les questionnaires Qualiopi basés sur une liste de sujets.

Ce modèle permet à l'application hôte de ne fournir que les sujets travaillés
pendant une formation. Le compilateur expanse ensuite cette source en formulaire
V1 standard avant la validation schema, la compilation des pages et le rendu.

```yaml
version: 1
kind: form-preset
preset: qualiopi.subject-progress.v1
id: management-qualiopi
metadata:
  title: "Formation management"
  locale: "fr-FR"
qualiopi:
  training:
    title: "Manager une equipe"
  subjects:
    - id: posture_manageriale
      label: "Adopter une posture manageriale"
    - id: entretien_recadrage
      label: "Mener un entretien de recadrage"
outputs:
  - hot
  - cold
```

Champs :

- `kind` vaut `form-preset` ;
- `preset` vaut `qualiopi.subject-progress.v1` ;
- `metadata` reprend les champs du formulaire standard ;
- `qualiopi.training.title` documente la prestation ;
- `qualiopi.subjects` contient les sujets à évaluer ;
- `outputs` est optionnel et accepte `hot`, `cold`, ou les deux.

Si `outputs` est omis, le preset génère les deux questionnaires :

- `hot` : progression ressentie sur chaque sujet, satisfaction globale,
  difficulté/réclamation et commentaire libre ;
- `cold` : utilisation effective de chaque sujet, utilité ressentie, contexte
  d'usage, freins, besoin complémentaire et commentaire libre.

Les ids de sujets doivent être stables. Ils produisent des ids de questions
stables :

```txt
hot_progress_posture_manageriale
cold_used_posture_manageriale
cold_usefulness_posture_manageriale
```

Si un sujet ne définit pas `id`, le compilateur dérive un id depuis `label`.
Cette dérivation est pratique pour prototyper, mais un id explicite est recommandé
pour les questionnaires utilisés en production afin de stabiliser les exports de
réponses.

Le preset ne change pas le runtime : le résultat compilé reste un
`CompiledForm` standard, rendu par `FormRunner`, `FormPreview` et
`FormDesigner`.

---

## 7. Types de questions V1

La V1 doit couvrir les types classiques d’un Google Forms-like.

### 7.1. Texte court

```yaml
- id: first_name
  type: question
  questionType: short-text
  title: "Prénom"
  description: "Votre prénom usuel."
  required: true
  validation:
    minLength: 2
    maxLength: 80
```

Réponse :

```json
{
  "first_name": "Sophie"
}
```

### 7.2. Texte long

```yaml
- id: feedback
  type: question
  questionType: long-text
  title: "Votre retour détaillé"
  required: false
  validation:
    maxLength: 2000
```

Réponse :

```json
{
  "feedback": "Le contenu était clair..."
}
```

### 7.3. Oui / non

```yaml
- id: consent
  type: question
  questionType: yes-no
  title: "Acceptez-vous d’être recontacté ?"
  required: true
```

Réponse :

```json
{
  "consent": true
}
```

### 7.4. Choix unique

```yaml
- id: role
  type: question
  questionType: single-choice
  title: "Votre rôle"
  required: true
  options:
    - value: manager
      label: "Manager"
    - value: hr
      label: "RH"
    - value: employee
      label: "Collaborateur"
```

Réponse :

```json
{
  "role": "manager"
}
```

### 7.5. Choix multiple

```yaml
- id: topics
  type: question
  questionType: multiple-choice
  title: "Quels sujets vous intéressent ?"
  required: false
  options:
    - value: mental_health
      label: "Santé mentale"
    - value: violence
      label: "Violences au travail"
    - value: equality
      label: "Égalité professionnelle"
```

Réponse :

```json
{
  "topics": ["mental_health", "equality"]
}
```

### 7.6. Liste déroulante

```yaml
- id: department
  type: question
  questionType: dropdown
  title: "Service"
  required: true
  options:
    - value: hr
      label: "Ressources humaines"
    - value: finance
      label: "Finance"
    - value: operations
      label: "Opérations"
```

Réponse :

```json
{
  "department": "hr"
}
```

### 7.7. Nombre

```yaml
- id: participants
  type: question
  questionType: number
  title: "Nombre de participants"
  required: true
  validation:
    min: 1
    max: 500
    integer: true
```

Réponse :

```json
{
  "participants": 24
}
```

### 7.8. Date

```yaml
- id: preferred_date
  type: question
  questionType: date
  title: "Date souhaitée"
  required: false
```

Réponse :

```json
{
  "preferred_date": "2026-05-03"
}
```

### 7.9. Échelle linéaire

```yaml
- id: satisfaction
  type: question
  questionType: linear-scale
  title: "Votre satisfaction globale"
  required: true
  config:
    min: 1
    max: 5
    minLabel: "Pas satisfait"
    maxLabel: "Très satisfait"
```

Réponse :

```json
{
  "satisfaction": 4
}
```

### 7.10. Note / étoiles

```yaml
- id: recommendation
  type: question
  questionType: rating
  title: "Recommanderiez-vous cette formation ?"
  required: true
  config:
    max: 5
    icon: star
```

Réponse :

```json
{
  "recommendation": 5
}
```

### 7.11. Bloc informatif

```yaml
- id: info_1
  type: statement
  title: "Information"
  markdown: |
    Les réponses sont utilisées uniquement pour améliorer les formations.
```

Pas de réponse associée.

---

## 8. Types de questions à prévoir après la V1

Ces types ne sont pas nécessaires dans la première implémentation, mais le modèle doit permettre leur ajout sans refonte :

- email ;
- téléphone ;
- URL ;
- heure ;
- choix unique avec option “Autre” ;
- choix multiple avec option “Autre” ;
- grille de choix unique ;
- grille de cases à cocher ;
- Net Promoter Score ;
- upload de fichier ;
- signature ;
- consentement RGPD ;
- question calculée ;
- question masquée ;
- champ prérempli ;
- section conditionnelle ;
- question dépendante d’une réponse précédente.

Pour la V1, il vaut mieux éviter l’upload de fichier, car cela implique une politique de stockage spécifique.

---

## 9. Modèle de domaine

### 9.1. Source

```ts
export type FormSource = {
  readonly uri?: string;
  readonly content: string;
};
```

### 9.2. Résultat de compilation

```ts
export type CompileFormResult =
  | {
      readonly status: "valid";
      readonly form: CompiledForm;
      readonly diagnostics: readonly [];
    }
  | {
      readonly status: "degraded";
      readonly form: CompiledForm;
      readonly diagnostics: readonly FormDiagnostic[];
    }
  | {
      readonly status: "invalid";
      readonly fallback: DebugFormViewModel;
      readonly diagnostics: readonly FormDiagnostic[];
    };
```

### 9.3. Formulaire compilé

```ts
export type CompiledForm = {
  readonly version: 1;
  readonly metadata: FormMetadata;
  readonly theme: CompiledFormTheme;
  readonly pages: readonly CompiledFormPage[];
  readonly questionIndex: ReadonlyMap<QuestionId, CompiledQuestion>;
};
```

### 9.4. Page compilée

```ts
export type CompiledFormPage = {
  readonly id: PageId;
  readonly index: number;
  readonly title: string;
  readonly description?: string;
  readonly elements: readonly CompiledFormElement[];
};
```

### 9.5. Élément compilé

```ts
export type CompiledFormElement =
  | CompiledQuestionElement
  | CompiledStatementElement;

export type CompiledQuestionElement = {
  readonly kind: "question";
  readonly id: QuestionId;
  readonly questionType: QuestionTypeId;
  readonly title: string;
  readonly description?: string;
  readonly required: boolean;
  readonly config: unknown;
  readonly validation: CompiledQuestionValidation;
  readonly source: ElementSourceInfo;
};

export type CompiledStatementElement = {
  readonly kind: "statement";
  readonly id: ElementId;
  readonly title?: string;
  readonly markdown: string;
  readonly source: ElementSourceInfo;
};
```

`config` est `unknown` dans le modèle générique. Chaque type de question le caste via son propre schéma typé. Ne pas utiliser `any`.

---

## 10. QuestionTypeDefinition

Chaque type de question doit être autonome.

```ts
export type QuestionTypeDefinition<
  TConfig,
  TAnswer,
> = {
  readonly id: QuestionTypeId;
  readonly label: string;
  readonly description?: string;
  readonly icon?: React.ComponentType;

  readonly configSchema: z.ZodType<TConfig>;

  readonly defaultConfig: TConfig;

  readonly createDefaultQuestion: (
    context: CreateDefaultQuestionContext,
  ) => RawQuestionElement;

  readonly compile: (
    input: CompileQuestionInput<TConfig>,
  ) => CompileQuestionOutput;

  readonly validateAnswer: (
    input: ValidateAnswerInput<TConfig, TAnswer>,
  ) => readonly FormAnswerDiagnostic[];

  readonly serializeAnswer: (
    input: SerializeAnswerInput<TConfig, TAnswer>,
  ) => unknown;

  readonly renderer: React.ComponentType<QuestionRendererProps<TConfig, TAnswer>>;

  readonly editor: React.ComponentType<QuestionEditorProps<TConfig>>;
};
```

### 10.1. Pourquoi cette interface ?

Elle permet d’ajouter un nouveau type de question sans modifier le compilateur central ni le designer.

Un type de question fournit :

- son schéma de configuration ;
- sa configuration par défaut ;
- son rendu participant ;
- son éditeur dans le designer ;
- sa validation de réponse ;
- sa sérialisation JSON.

---

## 11. Compiler

### 11.1. API

```ts
export type CompileFormOptions = {
  readonly mode?: "authoring" | "strict";
};

export function compileForm(
  source: FormSource,
  runtime: FormRuntime,
  options?: CompileFormOptions,
): CompileFormResult;
```

### 11.2. Mode `authoring`

Utilisé dans le designer.

Objectifs :

- continuer à afficher autant que possible ;
- produire un modèle dégradé si possible ;
- créer des pages ou éléments synthétiques si nécessaire ;
- remonter des diagnostics localisés ;
- ne pas bloquer l’utilisateur dès qu’une erreur mineure apparaît.

Exemples :

```txt
page sans elements
question sans title
question sans options
type inconnu
id manquant
```

En mode `authoring`, certains cas peuvent produire un formulaire partiel avec diagnostics.

### 11.3. Mode `strict`

Utilisé avant publication ou exécution réelle.

Objectifs :

- refuser les erreurs structurelles ;
- ne pas réparer silencieusement ;
- garantir que le formulaire est exécutable ;
- empêcher un questionnaire final incomplet.

Exemples d’erreurs bloquantes :

```txt
YAML invalide
kind incorrect
version incompatible
page sans id
question sans id
question sans type
questionType inconnu
question obligatoire mal configurée
choix unique sans options
ids dupliqués
```

### 11.4. Pipeline

```txt
1. parse YAML
2. collect syntax errors and warnings
3. expand supported presets, if kind: form-preset
4. validate raw schema
5. normalize metadata
6. validate unique ids
7. resolve theme
8. resolve question types
9. validate each question config
10. compile pages
11. compile elements
12. validate semantic rules
13. produce CompiledForm or DebugFormViewModel
```

---

## 12. Diagnostics

### 12.1. Type

```ts
export type FormDiagnostic = {
  readonly code: FormDiagnosticCode;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly path?: readonly string[];
  readonly range?: SourceRange;
  readonly pageId?: string;
  readonly elementId?: string;
  readonly questionId?: string;
  readonly hint?: string;
  readonly related?: readonly RelatedDiagnostic[];
};
```

### 12.2. Codes de diagnostics

```ts
export type FormDiagnosticCode =
  | "YAML_SYNTAX_ERROR"
  | "SCHEMA_UNKNOWN_FIELD"
  | "SCHEMA_MISSING_FIELD"
  | "SCHEMA_INVALID_VALUE"
  | "FORM_UNSUPPORTED_VERSION"
  | "FORM_INVALID_KIND"
  | "PAGE_MISSING_ID"
  | "PAGE_DUPLICATE_ID"
  | "PAGE_MISSING_TITLE"
  | "ELEMENT_MISSING_ID"
  | "ELEMENT_DUPLICATE_ID"
  | "ELEMENT_UNKNOWN_TYPE"
  | "QUESTION_MISSING_TITLE"
  | "QUESTION_UNKNOWN_TYPE"
  | "QUESTION_INVALID_CONFIG"
  | "QUESTION_REQUIRED_WITHOUT_VALID_ANSWER"
  | "QUESTION_OPTIONS_EMPTY"
  | "QUESTION_OPTION_DUPLICATE_VALUE"
  | "QUESTION_OPTION_MISSING_LABEL"
  | "ANSWER_REQUIRED"
  | "ANSWER_INVALID_TYPE"
  | "ANSWER_INVALID_VALUE"
  | "ANSWER_TOO_SHORT"
  | "ANSWER_TOO_LONG"
  | "ANSWER_TOO_SMALL"
  | "ANSWER_TOO_LARGE"
  | "THEME_NOT_FOUND"
  | "RENDERER_NOT_FOUND"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_QUOTA_EXCEEDED";
```

### 12.3. Exemple

```ts
{
  code: "QUESTION_OPTIONS_EMPTY",
  severity: "error",
  message: "La question 'Votre rôle' doit contenir au moins une option.",
  path: ["pages", "0", "elements", "2", "options"],
  pageId: "introduction",
  questionId: "role",
  range: {
    start: { line: 24, column: 9, offset: 521 },
    end: { line: 24, column: 16, offset: 528 }
  },
  hint: "Ajoutez au moins deux options pour un choix unique."
}
```

### 12.4. Source mapping

Le designer doit pouvoir afficher des vagues rouges sur les zones YAML incriminées. Il faut donc conserver :

```txt
offset global
line
column
path YAML
id de page
id d’élément
id de question
```

La source YAML doit être parsée avec un parser permettant d’obtenir des erreurs et des positions exploitables.

---

## 13. Designer

### 13.1. Objectif UX

Le designer est un composant React permettant de construire un questionnaire sans écrire le YAML à la main.

Disposition desktop recommandée :

```txt
┌─────────────────────────────────────────────────────────────────────┐
│ Top bar                                                             │
│ Titre form · mode Form/YAML/Preview · sauvegarde · diagnostics      │
├───────────────────────────────┬───────────────────────┬─────────────┤
│ Canvas central                │ Inspector optionnel   │ Palette     │
│                               │                       │ à droite    │
│ Page 1                        │ Propriétés sélection  │             │
│ ┌ Question sélectionnée ┐      │                       │ + Texte court│
│ └───────────────────────┘      │                       │ + Texte long │
│                               │                       │ + Oui/Non    │
│ Page 2                        │                       │ + Choix      │
│ ...                           │                       │ + Saut page  │
├───────────────────────────────┴───────────────────────┴─────────────┤
│ Diagnostics panel / version history                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.2. Zone centrale

La zone centrale affiche la liste des pages et des éléments.

L’utilisateur peut :

- sélectionner une page ;
- sélectionner une question ;
- ajouter une question après l’élément sélectionné ;
- ajouter une question à la fin de la page si rien n’est sélectionné ;
- ajouter une nouvelle page après la page active ;
- dupliquer une question ;
- supprimer une question ;
- déplacer une question ;
- changer le type de question si une migration est possible ;
- éditer les champs visibles de la question.

### 13.3. Palette à droite

La palette contient :

```txt
Questions
- Texte court
- Texte long
- Oui / Non
- Choix unique
- Choix multiple
- Liste déroulante
- Nombre
- Date
- Échelle linéaire
- Note

Structure
- Texte informatif
- Saut de page
```

Quand l’utilisateur clique sur un élément de palette :

- si une question est sélectionnée, la nouvelle question est ajoutée après ;
- si une page est sélectionnée, la question est ajoutée à la fin de la page ;
- si rien n’est sélectionné, la question est ajoutée à la fin de la dernière page ;
- si l’élément est “Saut de page”, une nouvelle page est créée après la page active.

### 13.4. Mode Form / YAML / Preview

La dropdown principale propose :

```txt
Form
YAML
Preview
```

#### Mode Form

Mode visuel principal.

Il permet :

- édition des pages ;
- édition des questions ;
- modification des options ;
- configuration obligatoire/facultatif ;
- réordonnancement ;
- ajout/suppression.

#### Mode YAML

Mode source.

Il permet :

- édition directe du YAML ;
- diagnostics localisés ;
- vagues rouges ;
- panneau de problèmes ;
- hover diagnostic ;
- synchronisation avec le modèle compilé.

#### Mode Preview

Mode participant simulé.

Il permet :

- tester le questionnaire ;
- répondre aux questions ;
- naviguer entre les pages ;
- voir les erreurs de validation de réponse ;
- produire un JSON de test ;
- vérifier l’ergonomie avant publication.

---

## 14. API React publique

### 14.1. `FormDesigner`

```ts
export type FormDesignerProps = {
  readonly source: FormSource;
  readonly runtime?: FormRuntime;

  readonly options?: FormDesignerOptions;

  readonly storage?: false | FormDesignerStorageOptions;

  readonly selectedElementId?: ElementId;
  readonly defaultSelectedElementId?: ElementId;

  readonly onSourceChange?: (event: FormSourceChangeEvent) => void;
  readonly onCompile?: (event: FormCompileEvent) => void;
  readonly onSelectedElementChange?: (event: FormSelectedElementChangeEvent) => void;
  readonly onDiagnosticClick?: (event: FormDiagnosticClickEvent) => void;
};
```

### 14.2. `FormDesignerOptions`

```ts
export type FormDesignerOptions = {
  readonly mode?: {
    readonly defaultMode?: "form" | "yaml" | "preview";
    readonly allowYamlMode?: boolean;
    readonly allowPreviewMode?: boolean;
  };

  readonly panels?: {
    readonly palette?: false | PalettePanelOptions;
    readonly inspector?: false | InspectorPanelOptions;
    readonly diagnostics?: false | DiagnosticsPanelOptions;
    readonly versionHistory?: false | VersionHistoryPanelOptions;
  };

  readonly editing?: {
    readonly allowAddPage?: boolean;
    readonly allowDeletePage?: boolean;
    readonly allowAddQuestion?: boolean;
    readonly allowDeleteQuestion?: boolean;
    readonly allowDuplicateQuestion?: boolean;
    readonly allowReorder?: boolean;
    readonly allowQuestionTypeChange?: boolean;
  };

  readonly preview?: {
    readonly enabled?: boolean;
    readonly submitMode?: "simulate" | "callback";
  };
};
```

### 14.3. `FormRunner`

```ts
export type FormRunnerProps = {
  readonly form: CompiledForm;

  readonly initialAnswers?: FormAnswers;
  readonly value?: FormAnswers;

  readonly mode?: "standalone" | "embedded";

  readonly options?: FormRunnerOptions;

  readonly onAnswersChange?: (event: FormAnswersChangeEvent) => void;
  readonly onSubmit?: (event: FormSubmitEvent) => Promise<void> | void;
  readonly onValidationError?: (event: FormValidationErrorEvent) => void;
};
```

### 14.4. `FormRunnerOptions`

```ts
export type FormRunnerOptions = {
  readonly navigation?: {
    readonly mode?: "single-page" | "paged";
    readonly showProgress?: boolean;
    readonly showPreviousButton?: boolean;
  };

  readonly validation?: {
    readonly validateOnBlur?: boolean;
    readonly validateOnChange?: boolean;
    readonly validateOnSubmit?: boolean;
  };

  readonly submit?: {
    readonly buttonLabel?: string;
    readonly disabledWhenInvalid?: boolean;
  };
};
```

### 14.5. `FormPreview`

```ts
export type FormPreviewProps = {
  readonly compileResult: CompileFormResult;
  readonly runtime?: FormRuntime;
  readonly options?: FormPreviewOptions;
  readonly onSubmitPreview?: (event: FormSubmitEvent) => void;
};
```

### 14.6. `DebugFormFallback`

```ts
export type DebugFormFallbackProps = {
  readonly source: FormSource;
  readonly diagnostics: readonly FormDiagnostic[];
  readonly onDiagnosticSelect?: (diagnostic: FormDiagnostic) => void;
};
```

---

## 15. JSON de réponses

### 15.1. Objectif

Le questionnaire final doit produire un JSON structuré, stable, exploitable par l’application hôte.

### 15.2. Format recommandé

```ts
export type FormSubmitPayload = {
  readonly form: {
    readonly id?: string;
    readonly title: string;
    readonly version: number;
    readonly sourceHash: string;
  };

  readonly submittedAt: string;

  readonly answers: Record<QuestionId, unknown>;

  readonly pages: readonly FormSubmitPagePayload[];

  readonly metadata?: Record<string, unknown>;
};
```

### 15.3. Exemple

```json
{
  "form": {
    "id": "satisfaction-formation",
    "title": "Questionnaire de satisfaction",
    "version": 1,
    "sourceHash": "sha256:..."
  },
  "submittedAt": "2026-05-03T21:34:00.000Z",
  "answers": {
    "full_name": "Sophie Jalon",
    "satisfied": true,
    "rating": 5,
    "comments": "Très utile."
  },
  "pages": [
    {
      "id": "introduction",
      "answers": {
        "full_name": "Sophie Jalon",
        "satisfied": true
      }
    },
    {
      "id": "details",
      "answers": {
        "rating": 5,
        "comments": "Très utile."
      }
    }
  ]
}
```

### 15.4. Pourquoi garder `answers` et `pages` ?

`answers` permet un accès direct par `questionId`.

`pages` permet de conserver une structure utile pour audit, affichage ou export.

---

## 16. Validation des réponses

La validation de réponse est distincte de la validation YAML.

### 16.1. Validation YAML

Elle répond à la question :

```txt
Le questionnaire est-il bien formé ?
```

### 16.2. Validation réponse

Elle répond à la question :

```txt
Les réponses du participant sont-elles acceptables ?
```

### 16.3. Diagnostic de réponse

```ts
export type FormAnswerDiagnostic = {
  readonly code: FormDiagnosticCode;
  readonly severity: "error" | "warning";
  readonly questionId: QuestionId;
  readonly message: string;
  readonly hint?: string;
};
```

Exemples :

```txt
Réponse obligatoire manquante.
Le texte doit contenir au moins 2 caractères.
La valeur doit être comprise entre 1 et 5.
La réponse doit être une des options autorisées.
```

---

## 17. Storage designer

### 17.1. Objectif

Le designer doit pouvoir sauvegarder automatiquement les versions du questionnaire en local pour éviter les pertes en cas de crash, fermeture d’onglet ou erreur utilisateur.

### 17.2. Interface

```ts
export interface FormDesignerPersistenceAdapter {
  loadDraft(formId: FormDocumentId): Promise<FormStoredDraft | null>;
  saveDraft(request: SaveFormDraftRequest): Promise<FormStorageResult>;

  listVersions(formId: FormDocumentId): Promise<readonly FormVersionMeta[]>;
  loadVersion(versionId: FormVersionId): Promise<FormSource | null>;
  saveVersion(request: SaveFormVersionRequest): Promise<FormStorageResult>;
  deleteVersion(versionId: FormVersionId): Promise<FormStorageResult>;

  prune(request: PruneFormVersionsRequest): Promise<FormStorageResult>;
}
```

### 17.3. Options

```ts
export type FormDesignerStorageOptions = {
  readonly formId: FormDocumentId;

  readonly adapter?: FormDesignerPersistenceAdapter;

  readonly autosave?: {
    readonly enabled?: boolean;
    readonly debounceMs?: number;
  };

  readonly snapshots?: {
    readonly saveOnValidCompile?: boolean;
    readonly saveOnManualAction?: boolean;
    readonly maxVersionsPerForm?: number;
  };

  readonly recovery?: {
    readonly enabled?: boolean;
    readonly preferLastValidVersion?: boolean;
    readonly showRecoveryDialogOnMount?: boolean;
  };
};
```

### 17.4. Résultat typé

```ts
export type FormStorageResult =
  | { readonly status: "success" }
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "quota-exceeded"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };
```

---

## 18. Thèmes

### 18.1. Principe

Le thème doit être résolu au runtime.

```yaml
theme:
  id: qastia-light
```

Puis :

```ts
runtime.themes.get(rawForm.theme.id)
```

### 18.2. Modèle recommandé

```ts
export type FormThemeDefinition = {
  readonly id: FormThemeId;
  readonly label: string;
  readonly version?: string;
  readonly tokens: FormThemeTokens;
  readonly cssClassName?: string;
};
```

### 18.3. Tokens

```ts
export type FormThemeTokens = {
  readonly color: {
    readonly background: string;
    readonly foreground: string;
    readonly primary: string;
    readonly muted: string;
    readonly surface: string;
    readonly border: string;
    readonly danger: string;
  };

  readonly font: {
    readonly heading: string;
    readonly body: string;
    readonly mono: string;
  };

  readonly spacing: {
    readonly pagePadding: string;
    readonly questionGap: string;
    readonly fieldGap: string;
  };

  readonly radius: {
    readonly card: string;
    readonly input: string;
  };
};
```

### 18.4. Scoping CSS

Le thème doit cibler uniquement le formulaire rendu, pas le designer global.

```css
.qastia-form-theme-root .qastia-form-page {
  background: var(--qastia-form-color-background);
  color: var(--qastia-form-color-foreground);
}
```

---

## 19. Preview

La preview doit utiliser le même moteur que le formulaire final.

```txt
FormPreview
  ↓
FormRunner
  ↓
QuestionRenderer
```

Elle peut ajouter des éléments de debug :

- bouton “Voir JSON” ;
- affichage des erreurs de validation ;
- reset des réponses ;
- simulation de soumission.

Il ne faut pas maintenir un moteur de preview séparé.

---

## 20. Accessibilité

Le formulaire final doit respecter les principes suivants :

- chaque question a un label accessible ;
- les descriptions sont reliées au champ via `aria-describedby` ;
- les erreurs sont annoncées ;
- les champs obligatoires sont indiqués ;
- la navigation clavier fonctionne ;
- le focus passe correctement à la première erreur à la soumission ;
- les groupes radio/checkbox ont un `fieldset` et une `legend` ;
- les boutons ont des libellés explicites ;
- les couleurs d’erreur ne doivent pas être le seul indicateur.

Le designer peut être moins strict au départ, mais le runner participant doit être solide.

---

## 21. Sécurité

La source YAML peut être modifiée par des utilisateurs. Il faut donc :

- interdire HTML brut par défaut ;
- sanitizer tout Markdown rendu ;
- éviter `dangerouslySetInnerHTML`, sauf cas strictement contrôlé ;
- filtrer les URLs ;
- ne jamais exécuter du JS provenant du YAML ;
- contrôler les futures intégrations iframe/media ;
- ne pas stocker de secrets dans la source du formulaire ;
- traiter les réponses comme données utilisateur non fiables.

---

## 22. Runtime

### 22.1. API

```ts
export type CreateFormRuntimeOptions = {
  readonly questionTypes?: readonly QuestionTypeDefinition<unknown, unknown>[];
  readonly themes?: readonly FormThemeDefinition[];
  readonly validators?: readonly FormValidatorDefinition[];
  readonly renderers?: readonly FormRendererDefinition[];
};

export function createFormRuntime(
  options?: CreateFormRuntimeOptions,
): FormRuntime;
```

### 22.2. Runtime

```ts
export type FormRuntime = {
  readonly questionTypes: QuestionTypeRegistry;
  readonly themes: FormThemeRegistry;
  readonly validators: FormValidatorRegistry;
  readonly renderers: FormRendererRegistry;
};
```

### 22.3. Collision

Prévoir une stratégie de collision :

```ts
export type RegistryCollisionStrategy =
  | "throw"
  | "override"
  | "keep-first";
```

Par défaut recommandé :

```txt
override des defaults par les extensions host
warning en développement
```

---

## 23. Entrées publiques

### 23.1. Entrée racine

```ts
import {
  FormDesigner,
  FormRunner,
  FormPreview,
  DebugFormFallback,
  compileForm,
  createFormRuntime,
  defaultFormRuntime,
} from "@bjalon/form-runtime";

import "@bjalon/form-runtime/styles.css";
```

### 23.2. Entrypoints futurs

Pour alléger les bundles :

```txt
@bjalon/form-runtime/compiler
@bjalon/form-runtime/runtime
@bjalon/form-runtime/runner
@bjalon/form-runtime/designer
@bjalon/form-runtime/preview
@bjalon/form-runtime/debug
```

Exemple :

```ts
import { FormRunner } from "@bjalon/form-runtime/runner";
import { compileForm } from "@bjalon/form-runtime/compiler";
```

Le runner ne doit pas charger CodeMirror ou le designer.

---

## 24. Tests

### 24.1. Tests compilateur

Cas à couvrir :

- YAML invalide ;
- kind incorrect ;
- version incompatible ;
- page sans id ;
- id dupliqué ;
- question sans title ;
- questionType inconnu ;
- choix unique sans options ;
- option dupliquée ;
- config invalide ;
- thème inconnu ;
- mode authoring vs strict ;
- diagnostics avec ranges ;
- fallback invalid.

### 24.2. Tests runner

Cas à couvrir :

- rendu question texte ;
- rendu oui/non ;
- rendu choix unique ;
- rendu choix multiple ;
- validation required ;
- validation min/max ;
- navigation paged ;
- submit JSON ;
- callback appelé ;
- focus sur première erreur.

### 24.3. Tests designer

Cas à couvrir :

- ajout d’une question après sélection ;
- ajout d’une page ;
- suppression ;
- duplication ;
- changement de type ;
- édition YAML ;
- diagnostics affichés ;
- preview synchronisée ;
- sauvegarde autosave ;
- recovery.

### 24.4. Tests package

Comme pour `@bjalon/deck-runtime`, il est recommandé de tester le package buildé réel :

```txt
npm run build
npm run test:package
```

---

## 25. Build

Structure attendue :

```txt
dist/
  form-runtime.js
  form-runtime.css
  types/
```

Exports V1 :

```json
{
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/form-runtime.js"
    },
    "./styles.css": "./dist/form-runtime.css"
  }
}
```

Exports cible :

```json
{
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/form-runtime.js"
    },
    "./compiler": {
      "types": "./dist/types/compiler/index.d.ts",
      "import": "./dist/compiler.js"
    },
    "./runner": {
      "types": "./dist/types/runner/index.d.ts",
      "import": "./dist/runner.js"
    },
    "./designer": {
      "types": "./dist/types/designer/index.d.ts",
      "import": "./dist/designer.js"
    },
    "./styles.css": "./dist/form-runtime.css"
  }
}
```

---

## 26. Exemple intégré

Créer :

```txt
examples/integrated/
```

L’exemple doit montrer :

- formulaire YAML ;
- designer visuel ;
- palette à droite ;
- ajout de questions ;
- ajout de pages ;
- mode YAML ;
- diagnostics ;
- preview ;
- simulation de soumission ;
- JSON des réponses ;
- autosave localStorage ;
- recovery ;
- thème sélectionnable.

---

## 27. Points volontairement exclus de la V1

Pour garder la V1 maîtrisable, exclure temporairement :

- édition collaborative ;
- upload de fichiers ;
- logique conditionnelle complexe ;
- scoring avancé ;
- analytics ;
- backend de stockage ;
- authentification participant ;
- paiement ;
- signature électronique juridiquement engageante ;
- formulaires multilingues avancés ;
- imports Google Forms ;
- exports Excel/PDF avancés ;
- thème designer complet.

Le modèle doit cependant rester compatible avec ces évolutions.

---

## 28. Conclusion

`@bjalon/form-runtime` doit être conçu comme un moteur de questionnaire compilable, pas comme un simple composant React.

Le cœur durable est :

```txt
YAML source
   ↓
compileForm()
   ↓
CompiledForm + diagnostics
   ↓
FormDesigner / FormRunner / FormPreview
   ↓
FormSubmitPayload JSON
```

La V1 doit prioriser :

- un YAML simple et strict ;
- les principaux types de questions ;
- un designer ergonomique ;
- une palette à droite ;
- une prévisualisation fiable ;
- des diagnostics localisés ;
- un JSON de réponses propre ;
- une intégration React simple ;
- une architecture extensible.

Le modèle doit rester proche de celui du deck runtime, afin que les deux librairies puissent partager une philosophie, voire certaines briques techniques : diagnostics, source mapping, storage, themes, runtime registries et mode debug.
