# Lots d’implémentation — `@qastia/form-runtime`

## 1. Objectif du découpage

Ce document découpe l’implémentation de `@qastia/form-runtime` en lots cohérents.

Chaque lot doit produire une valeur vérifiable et limiter les dépendances inutiles. L’objectif est d’arriver rapidement à une V1 utilisable, sans bloquer les évolutions futures : nouveaux types de questions, designer avancé, thèmes, stockage, preview, diagnostics et soumission JSON.

---

## 2. Vue d’ensemble des lots

```txt
Lot 0  — Initialisation projet librairie
Lot 1  — Domaine public et modèle YAML V1
Lot 2  — Compilateur YAML avec diagnostics
Lot 3  — Runtime registries
Lot 4  — Types de questions V1
Lot 5  — FormRunner participant
Lot 6  — JSON de réponses et validation de soumission
Lot 7  — FormPreview
Lot 8  — FormDesigner shell
Lot 9  — Canvas designer pages/questions
Lot 10 — Palette à droite et ajout d’éléments
Lot 11 — Inspectors et édition des questions
Lot 12 — Mode YAML avec diagnostics localisés
Lot 13 — Sauvegarde locale, versions et recovery
Lot 14 — Thèmes et styles
Lot 15 — Exemple intégré
Lot 16 — Tests package et CI
Lot 17 — Stabilisation API publique
Lot 18 — Évolutions post-V1
```

---

# Lot 0 — Initialisation projet librairie

## Objectif

Créer le package `@qastia/form-runtime` avec une structure de librairie React/TypeScript similaire à `@qastia/deck-runtime`.

## Tâches

- Créer le package.
- Configurer TypeScript strict.
- Configurer Vite en mode librairie.
- Configurer Vitest.
- Configurer Jest ou tests de package buildé si nécessaire.
- Configurer ESLint.
- Configurer le build CSS.
- Créer `src/index.ts`.
- Créer `src/publicTypes.ts`.
- Créer `src/styles/form-runtime.css`.
- Créer un exemple minimal dans `examples/integrated`.

## Arborescence cible minimale

```txt
src/
  compiler/
  runtime/
  domain/
  schema/
  runner/
  designer/
  preview/
  debug/
  storage/
  styles/
  publicTypes.ts
  index.ts
```

## Critères d’acceptation

- `npm run build` produit un package.
- `npm run typecheck` passe.
- `npm test` passe.
- Le package expose au moins un composant placeholder.
- Le CSS est exporté via `./styles.css`.

---

# Lot 1 — Domaine public et modèle YAML V1

## Objectif

Définir les types fondamentaux du formulaire.

## Tâches

- Définir `FormSource`.
- Définir `RawForm`, `RawFormPage`, `RawFormElement`.
- Définir `CompiledForm`, `CompiledFormPage`, `CompiledFormElement`.
- Définir `QuestionTypeId`, `QuestionId`, `PageId`, `ElementId`.
- Définir `FormDiagnostic`.
- Définir `CompileFormResult`.
- Définir `FormRuntime`.
- Définir `FormAnswers`.
- Définir `FormSubmitPayload`.

## Types principaux

```ts
type FormSource = {
  readonly uri?: string;
  readonly content: string;
};

type CompileFormResult =
  | { readonly status: "valid"; readonly form: CompiledForm; readonly diagnostics: readonly [] }
  | { readonly status: "degraded"; readonly form: CompiledForm; readonly diagnostics: readonly FormDiagnostic[] }
  | { readonly status: "invalid"; readonly fallback: DebugFormViewModel; readonly diagnostics: readonly FormDiagnostic[] };
```

## Critères d’acceptation

- Tous les types publics sont exportés.
- Aucun `any`.
- Les types génériques utilisent `unknown` si nécessaire.
- Le domaine ne dépend pas de React.

---

# Lot 2 — Compilateur YAML avec diagnostics

## Objectif

Implémenter `compileForm()`.

## Tâches

- Parser le YAML.
- Gérer les erreurs syntaxiques.
- Valider le schéma avec Zod.
- Produire des diagnostics localisés.
- Valider `version` et `kind`.
- Valider les pages.
- Valider les éléments.
- Valider les ids uniques.
- Produire `valid`, `degraded` ou `invalid`.
- Implémenter `mode: "authoring" | "strict"`.

## Diagnostics minimum

- `YAML_SYNTAX_ERROR`
- `FORM_UNSUPPORTED_VERSION`
- `FORM_INVALID_KIND`
- `PAGE_MISSING_ID`
- `PAGE_DUPLICATE_ID`
- `ELEMENT_DUPLICATE_ID`
- `ELEMENT_UNKNOWN_TYPE`
- `QUESTION_UNKNOWN_TYPE`
- `QUESTION_MISSING_TITLE`
- `SCHEMA_UNKNOWN_FIELD`
- `SCHEMA_MISSING_FIELD`
- `SCHEMA_INVALID_VALUE`

## Mode authoring

En mode authoring :

- autoriser un formulaire partiel ;
- créer des éléments synthétiques si utile ;
- produire un `degraded` plutôt qu’un `invalid` quand le rendu peut continuer.

## Mode strict

En mode strict :

- ne pas réparer silencieusement ;
- refuser les erreurs structurelles bloquantes.

## Critères d’acceptation

- YAML valide → `status: "valid"`.
- YAML invalide → `status: "invalid"` + diagnostics.
- Erreur localisée → diagnostic avec `range`.
- Id dupliqué → diagnostic.
- Question type inconnu → diagnostic.
- Le compilateur ne dépend pas de React.
- Le compilateur ne throw pas pour une erreur utilisateur.

---

# Lot 3 — Runtime registries

## Objectif

Permettre l’extension des types de questions, thèmes et renderers.

## Tâches

- Créer `createFormRuntime`.
- Créer `defaultFormRuntime`.
- Créer `QuestionTypeRegistry`.
- Créer `ThemeRegistry`.
- Créer `ValidatorRegistry`.
- Créer stratégie de collision.
- Brancher le compilateur sur le runtime.
- Résoudre les questions via `runtime.questionTypes.get(questionType)`.

## API

```ts
const runtime = createFormRuntime({
  questionTypes: customQuestionTypes,
  themes: customThemes,
});
```

## Critères d’acceptation

- Les question types par défaut sont disponibles.
- L’app hôte peut ajouter un type custom.
- Un type inconnu produit un diagnostic.
- Une collision d’id a un comportement défini.

---

# Lot 4 — Types de questions V1

## Objectif

Implémenter les types de questions essentiels.

## Types à livrer

1. `short-text`
2. `long-text`
3. `yes-no`
4. `single-choice`
5. `multiple-choice`
6. `dropdown`
7. `number`
8. `date`
9. `linear-scale`
10. `rating`
11. `statement`

## Pour chaque type

Implémenter :

- schéma config Zod ;
- default config ;
- création d’une question par défaut ;
- validation config ;
- renderer participant ;
- editor designer minimal ;
- validation réponse ;
- sérialisation réponse.

## Critères d’acceptation

- Chaque type est compilable.
- Chaque type est affichable dans `FormRunner`.
- Chaque type peut être ajouté depuis la palette.
- Chaque type a une réponse JSON stable.
- Les questions à options valident les options vides, dupliquées ou invalides.

---

# Lot 5 — FormRunner participant

## Objectif

Rendre un formulaire compilé pour un participant.

## Tâches

- Créer `FormRunner`.
- Créer `FormPageRenderer`.
- Créer `FormElementRenderer`.
- Créer `QuestionRenderer`.
- Créer navigation paginée.
- Gérer `single-page` et `paged`.
- Gérer les réponses internes.
- Gérer mode contrôlé / non contrôlé.
- Gérer les erreurs de réponse.
- Gérer `onSubmit`.

## API cible

```tsx
<FormRunner
  form={compiledForm}
  onSubmit={(event) => {
    console.log(event.payload);
  }}
/>
```

## Critères d’acceptation

- Un formulaire multi-pages est navigable.
- Les réponses sont saisissables.
- Les questions obligatoires sont bloquantes à la soumission.
- `onSubmit` reçoit un JSON stable.
- Le runner ne dépend pas du designer.
- Le runner fonctionne sans storage.

---

# Lot 6 — JSON de réponses et validation de soumission

## Objectif

Formaliser le payload de réponse.

## Tâches

- Définir `FormSubmitPayload`.
- Implémenter `buildSubmitPayload`.
- Ajouter `sourceHash`.
- Ajouter `submittedAt`.
- Ajouter `answers` flat.
- Ajouter `pages`.
- Implémenter validation complète avant submit.
- Gérer focus première erreur.

## Format cible

```json
{
  "form": {
    "id": "form-id",
    "title": "Questionnaire",
    "version": 1,
    "sourceHash": "sha256:..."
  },
  "submittedAt": "2026-05-03T21:34:00.000Z",
  "answers": {},
  "pages": []
}
```

## Critères d’acceptation

- Le JSON est déterministe.
- Les questions sans réponse non obligatoire sont absentes ou null selon règle documentée.
- Les questions obligatoires manquantes produisent une erreur.
- Les types de réponse sont cohérents avec les questions.
- Le callback `onSubmit` est appelé uniquement si la validation passe.

---

# Lot 7 — FormPreview

## Objectif

Prévisualiser le rendu participant depuis un résultat de compilation.

## Tâches

- Créer `FormPreview`.
- Afficher `FormRunner` si `valid` ou `degraded`.
- Afficher `DebugFormFallback` si `invalid`.
- Ajouter bouton reset.
- Ajouter affichage JSON de simulation.
- Ajouter diagnostics visibles en preview si option activée.

## Critères d’acceptation

- La preview utilise `FormRunner`.
- La preview ne duplique pas le moteur de rendu.
- La preview permet de tester une soumission.
- Le JSON simulé est visible.

---

# Lot 8 — FormDesigner shell

## Objectif

Créer la façade d’édition.

## Tâches

- Créer `FormDesigner`.
- Créer `defaultDesignerOptions`.
- Créer état de mode : `form`, `yaml`, `preview`.
- Brancher compilation sur changement de source.
- Afficher top bar.
- Afficher diagnostics.
- Afficher placeholder canvas.
- Afficher palette placeholder.
- Gérer `onSourceChange`.
- Gérer mode contrôlé / non contrôlé pour sélection.

## Critères d’acceptation

- `FormDesigner` s’affiche.
- Le mode Form/YAML/Preview fonctionne.
- La compilation se relance au changement de source.
- Les diagnostics sont visibles.
- L’app hôte reçoit `onSourceChange`.

---

# Lot 9 — Canvas designer pages/questions

## Objectif

Afficher et sélectionner les pages/questions du formulaire.

## Tâches

- Créer `DesignerCanvas`.
- Créer `PageBlock`.
- Créer `ElementBlock`.
- Créer `QuestionBlock`.
- Gérer sélection page.
- Gérer sélection question.
- Gérer état sélectionné.
- Afficher titre, description et required.
- Afficher état erreur sur question/page.
- Gérer empty state.

## Critères d’acceptation

- Toutes les pages sont visibles.
- Toutes les questions sont visibles.
- Cliquer sélectionne un élément.
- Les erreurs associées sont visibles.
- Le canvas reste utilisable en `degraded`.

---

# Lot 10 — Palette à droite et ajout d’éléments

## Objectif

Ajouter des questions et pages depuis une palette à droite.

## Tâches

- Créer `QuestionPalette`.
- Créer `PaletteItem`.
- Lister les types de question du runtime.
- Ajouter une question après l’élément sélectionné.
- Ajouter une question à la fin de la page active si aucune question sélectionnée.
- Ajouter une nouvelle page via “Saut de page”.
- Générer des ids uniques.
- Mettre à jour la source YAML de manière structurée, pas par regex.
- Sélectionner l’élément nouvellement créé.

## Critères d’acceptation

- Cliquer sur “Texte court” ajoute une question.
- Cliquer sur “Saut de page” ajoute une page.
- L’ajout se fait après la sélection.
- Les ids sont uniques.
- La source YAML reste propre.
- La preview se met à jour.

---

# Lot 11 — Inspectors et édition des questions

## Objectif

Permettre l’édition visuelle des pages et questions.

## Tâches

- Créer `FormInspector`.
- Créer `PageInspector`.
- Créer `QuestionInspector`.
- Créer `QuestionEditor` par type.
- Éditer titre questionnaire.
- Éditer titre page.
- Éditer description page.
- Éditer titre question.
- Éditer description question.
- Éditer required.
- Éditer options.
- Éditer config spécifique.
- Éditer validations simples.

## Ergonomie

- Champs courts en input.
- Descriptions et textes longs en textarea.
- Toggle obligatoire.
- Options éditables en liste.
- Bouton ajouter/supprimer option.
- Message d’erreur inline.
- Style moderne, cohérent avec le deck studio.

## Critères d’acceptation

- Modifier un champ met à jour le YAML.
- Les options de choix unique/multiple sont éditables.
- Le required est éditable.
- Les erreurs de configuration remontent dans diagnostics.
- Le changement est reflété dans la preview.

---

# Lot 12 — Mode YAML avec diagnostics localisés

## Objectif

Fournir un mode source avec assistance compilateur.

## Tâches

- Intégrer CodeMirror 6.
- Créer `FormYamlEditor`.
- Mapper diagnostics vers CodeMirror.
- Afficher vagues rouges.
- Afficher tooltip au hover.
- Afficher panneau de problèmes.
- Cliquer un diagnostic positionne le curseur.
- Synchroniser source YAML et compilation.
- Gérer YAML invalide sans écran blanc.

## Critères d’acceptation

- Une erreur YAML apparaît dans l’éditeur.
- Une erreur de question apparaît sur la bonne zone.
- Les diagnostics ont un message clair.
- Les hover affichent les hints.
- L’édition YAML met à jour le mode Form si la compilation repasse.
- Aucun écran blanc sur YAML invalide.

---

# Lot 13 — Sauvegarde locale, versions et recovery

## Objectif

Protéger le travail de design contre les pertes.

## Tâches

- Créer `FormDesignerPersistenceAdapter`.
- Implémenter `LocalStorageFormDesignerPersistenceAdapter`.
- Sauvegarder draft courant.
- Sauvegarder versions manuelles.
- Sauvegarder dernière version valide.
- Lister versions.
- Restaurer version.
- Supprimer version.
- Pruner anciennes versions.
- Gérer recovery au montage.
- Gérer localStorage indisponible.
- Gérer quota exceeded.
- Gérer JSON corrompu.

## Critères d’acceptation

- Autosave fonctionne.
- Une version peut être restaurée.
- Une version valide est conservée.
- Un crash simulé permet recovery.
- `storage={false}` désactive tout.
- L’adapter ne dépend pas de React.

---

# Lot 14 — Thèmes et styles

## Objectif

Fournir une apparence propre et extensible.

## Tâches

- Créer tokens de thème.
- Créer thèmes par défaut.
- Créer application CSS variables.
- Scoper les styles formulaire.
- Scoper les styles designer.
- Ne pas laisser le thème du formulaire impacter le designer hôte.
- Créer styles runner.
- Créer styles designer.
- Créer styles diagnostics.
- Créer styles palette.

## Critères d’acceptation

- Le formulaire a une apparence propre.
- Le designer a une apparence propre.
- Changer `theme.id` change le rendu.
- Les styles ne polluent pas l’app hôte.
- Le thème n’impacte pas les boutons du designer sauf choix explicite.

---

# Lot 15 — Exemple intégré

## Objectif

Fournir une app de démonstration complète.

## Tâches

- Créer `examples/integrated`.
- Ajouter formulaire exemple.
- Afficher `FormDesigner`.
- Afficher preview participant.
- Afficher JSON de réponse.
- Activer autosave.
- Activer recovery.
- Ajouter sélection de thème.
- Ajouter erreur boundary.
- Ajouter exemples d’erreurs YAML.
- Ajouter bouton reset source.

## Critères d’acceptation

- `npm run dev:example` lance la démo.
- `npm run build:example` passe.
- La démo montre tous les flux V1.
- La démo ne contient pas de logique cœur de librairie.

---

# Lot 16 — Tests package et CI

## Objectif

Fiabiliser la librairie.

## Tâches

- Ajouter tests compilateur.
- Ajouter tests runtime.
- Ajouter tests runner.
- Ajouter tests designer critiques.
- Ajouter tests storage.
- Ajouter tests package buildé.
- Ajouter workflow GitHub Actions.
- Ajouter build example.
- Ajouter publication GitHub Packages si souhaité.

## Critères d’acceptation

- `npm run typecheck` passe.
- `npm test` passe.
- `npm run test:package` passe.
- `npm run build` passe.
- `npm run build:example` passe.
- CI bloque publication si un test échoue.

---

# Lot 17 — Stabilisation API publique

## Objectif

Préparer une V1 consommable.

## Tâches

- Relire `publicTypes.ts`.
- Marquer API stable.
- Cacher les types internes.
- Ajouter documentation d’usage.
- Ajouter exemples d’intégration.
- Ajouter entrypoints séparés si nécessaire.
- Vérifier tree-shaking.
- Vérifier CSS export.
- Vérifier peer dependencies React.
- Vérifier absence de `any`.

## Critères d’acceptation

- Import racine fonctionne.
- Import CSS fonctionne.
- Les types publics sont lisibles.
- Le package peut être consommé par une app Vite.
- Le runner seul n’impose pas le designer dans le bundle, si entrypoints séparés livrés.

---

# Lot 18 — Évolutions post-V1

## Objectif

Préparer les évolutions sans les inclure dans le périmètre V1.

## Évolutions proposées

### 18.1. Logique conditionnelle

Permettre :

```yaml
visibleIf:
  question: satisfied
  equals: false
```

Cas d’usage :

- afficher une question seulement si une réponse précédente vaut une certaine valeur ;
- sauter une page ;
- demander un commentaire si note faible.

### 18.2. Scoring

Permettre :

- score par réponse ;
- score total ;
- feedback final conditionnel.

### 18.3. Designer de thème

Permettre :

- choix couleurs ;
- fonts ;
- radius ;
- preview live ;
- export `ThemeDefinition`.

### 18.4. Types avancés

Ajouter :

- email ;
- téléphone ;
- URL ;
- grille ;
- NPS ;
- fichier ;
- consentement ;
- signature.

### 18.5. Assets

Ajouter un asset resolver :

- images dans descriptions ;
- logo formulaire ;
- médias de page.

### 18.6. Import/export

Ajouter :

- export JSON schema ;
- import JSON ;
- export réponses CSV ;
- export réponses XLSX ;
- export questionnaire PDF.

### 18.7. Backend adapters

Ajouter :

- adapter REST ;
- adapter Firebase ;
- adapter Supabase ;
- adapter custom.

### 18.8. Internationalisation

Ajouter :

- libellés multilingues ;
- messages d’erreurs localisés ;
- formulaire multilingue.

---

# 3. Dépendances entre lots

```txt
Lot 0
  ↓
Lot 1
  ↓
Lot 2
  ↓
Lot 3
  ↓
Lot 4
  ↓
Lot 5
  ↓
Lot 6
  ↓
Lot 7
  ↓
Lot 8
  ↓
Lot 9
  ↓
Lot 10
  ↓
Lot 11
  ↓
Lot 12
  ↓
Lot 13
  ↓
Lot 14
  ↓
Lot 15
  ↓
Lot 16
  ↓
Lot 17
```

Certains lots peuvent être parallélisés :

```txt
Lot 14 peut commencer après Lot 5.
Lot 13 peut commencer après Lot 8.
Lot 16 peut commencer dès Lot 2.
Lot 15 peut commencer dès Lot 8.
```

---

# 4. MVP recommandé

Pour une première version utilisable, le MVP minimal est :

```txt
Lot 0 — Initialisation
Lot 1 — Domaine
Lot 2 — Compilateur
Lot 3 — Runtime
Lot 4 — Questions V1 partielles
Lot 5 — Runner
Lot 6 — Submit JSON
Lot 8 — Designer shell
Lot 9 — Canvas
Lot 10 — Palette
Lot 11 — Inspectors de base
Lot 12 — YAML diagnostics
Lot 15 — Exemple intégré
```

Questions V1 partielles pour MVP :

```txt
short-text
long-text
yes-no
single-choice
multiple-choice
statement
```

Puis ajouter ensuite :

```txt
dropdown
number
date
linear-scale
rating
```

---

# 5. Risques techniques

## 5.1. Designer trop monolithique

Risque :

```txt
FormDesigner devient un god component.
```

Prévention :

```txt
state/
canvas/
palette/
inspector/
sourceMode/
preview/
diagnostics/
versions/
```

## 5.2. YAML difficile à modifier proprement

Risque :

```txt
modifications par regex
perte de formatting
bugs d’indentation
```

Prévention :

```txt
utiliser parser YAML structuré
centraliser les mutations source
tester les patches
```

## 5.3. Diagnostics imprécis

Risque :

```txt
vagues rouges au mauvais endroit
erreurs peu utiles
```

Prévention :

```txt
source mapping dès Lot 2
diagnostics testés
path YAML obligatoire
range si disponible
```

## 5.4. Runner trop couplé au designer

Risque :

```txt
intégrer un formulaire final charge tout l’éditeur.
```

Prévention :

```txt
entrypoints séparés
pas d’import designer dans runner
pas de CodeMirror dans runner
```

## 5.5. Storage fragile

Risque :

```txt
quota localStorage
données corrompues
perte de source
```

Prévention :

```txt
résultat typé
recovery
pruning
hash
tests
```

---

# 6. Définition de “done” V1

La V1 est considérée terminée si :

- un questionnaire YAML peut être compilé ;
- les erreurs YAML sont localisées ;
- le designer permet d’ajouter pages et questions ;
- la palette à droite fonctionne ;
- les questions principales sont éditables ;
- la preview fonctionne ;
- le runner final fonctionne ;
- la soumission produit un JSON stable ;
- `onSubmit` est appelé avec le payload ;
- le stockage local peut sauvegarder/restaurer ;
- le package est buildable ;
- l’exemple intégré fonctionne ;
- les tests critiques passent.

---

# 7. Commandes attendues

```bash
npm run dev:example
npm run build
npm run build:example
npm run typecheck
npm test
npm run test:package
```

---

# 8. Conclusion

Le projet doit être implémenté progressivement en gardant trois couches nettes :

```txt
compiler/runtime
  ↓
runner/preview
  ↓
designer
```

Le piège principal serait de commencer par l’interface et de laisser le modèle se former au fil de l’eau. Il faut au contraire stabiliser très tôt :

- le YAML ;
- le modèle compilé ;
- les diagnostics ;
- les question type definitions ;
- le payload JSON de réponse.

Une fois ces contrats posés, le designer pourra évoluer sans fragiliser le runner, et le runner pourra être intégré dans n’importe quelle application sans embarquer toute la complexité de l’éditeur.
