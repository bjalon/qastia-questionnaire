# Lots d'implementation — `@bjalon/form-runtime`

## 1. Objectif du document

Ce document decrit l'etat d'avancement de `@bjalon/form-runtime` et le reste a faire pour stabiliser une V1 consommable dans `qastia-coaching`.

La librairie couvre deja le socle suivant :

- compilation YAML ;
- diagnostics localises ;
- runtime registries ;
- types de questions V1 ;
- runner participant ;
- payload JSON de reponses ;
- preview ;
- designer avec canvas, palette, inspector, YAML et versions locales ;
- exemple integre ;
- build package, build example, tests et CI.

Le reste a faire concerne surtout la robustesse, l'ergonomie, la couverture de tests, la stabilisation API et les evolutions post-V1.

---

## 2. Vue d'ensemble

```txt
Lot 0  — Initialisation projet librairie                   FAIT
Lot 1  — Domaine public et modele YAML V1                  FAIT
Lot 2  — Compilateur YAML avec diagnostics                 FAIT, a durcir
Lot 3  — Runtime registries                                FAIT, a documenter pour custom types
Lot 4  — Types de questions V1                             FAIT, editors a enrichir
Lot 5  — FormRunner participant                            FAIT, UX validation a affiner
Lot 6  — JSON de reponses et validation de soumission      FAIT
Lot 7  — FormPreview                                       FAIT
Lot 8  — FormDesigner shell                                FAIT
Lot 9  — Canvas designer pages/questions                   FAIT, actions avancees a ajouter
Lot 10 — Palette a droite et ajout d'elements              FAIT
Lot 11 — Inspectors et edition des questions               FAIT, ergonomie options a ameliorer
Lot 12 — Mode YAML avec diagnostics localises              FAIT, CodeMirror reste a integrer
Lot 13 — Sauvegarde locale, versions et recovery           FAIT, pruning/recovery a durcir
Lot 14 — Themes et styles                                  FAIT, designer de theme non inclus
Lot 15 — Exemple integre                                   FAIT, scenario demo a enrichir
Lot 16 — Tests package et CI                               FAIT, couverture a etendre
Lot 17 — Stabilisation API publique                        FAIT
Lot 18 — Evolutions post-V1                                DOCUMENTE
```

---

## 3. Lots livres

### Lot 0 — Initialisation projet librairie

Etat : **fait**.

Livre :

- package `@bjalon/form-runtime` ;
- TypeScript strict ;
- Vite en mode librairie ;
- Vitest ;
- build CSS ;
- entrypoints separes ;
- exemple `examples/integrated` ;
- GitHub Actions.

Reste a faire :

- ajouter ESLint si le projet Qastia veut une verification lint standardisee ;
- choisir une version semver de publication initiale.

---

### Lot 1 — Domaine public et modele YAML V1

Etat : **fait**.

Livre :

- `FormSource` ;
- `RawForm`, `RawFormPage`, `RawFormElement` ;
- `CompiledForm`, `CompiledFormPage`, `CompiledFormElement` ;
- ids publics ;
- `FormDiagnostic` ;
- `CompileFormResult` ;
- `FormRuntime` ;
- `FormAnswers` ;
- `FormSubmitPayload` ;
- `FORM_RUNTIME_PUBLIC_API_VERSION`.

Reste a faire :

- relire les noms publics avant tag V1 ;
- decider si les types `Raw*` doivent rester publics ou passer internes ;
- documenter la compatibilite attendue de `FORM_RUNTIME_PUBLIC_API_VERSION`.

---

### Lot 2 — Compilateur YAML avec diagnostics

Etat : **fait, a durcir**.

Livre :

- `compileForm()` ;
- parsing YAML ;
- validation Zod ;
- diagnostics avec `code`, `severity`, `path`, `range`, `hint`, `pageId`, `elementId` ;
- `mode: "authoring" | "strict"` ;
- source map YAML basique via `rangeForPath` ;
- strict mode bloquant sur champs inconnus, theme inconnu, navigation invalide.

Reste a faire :

- completer la source map YAML pour les cas complexes : tableaux inline, commentaires, anchors, YAML multiline ;
- ajouter des tests de localisation pour chaque diagnostic critique ;
- ajouter diagnostics `related` pour doublons avec reference de l'element original ;
- verifier que toutes les erreurs Zod ont un message utilisateur comprehensible en francais ;
- decider si `sourceHash` reste `fnv1a` ou passe en `sha256` avant V1.

---

### Lot 3 — Runtime registries

Etat : **fait**.

Livre :

- `createFormRuntime` ;
- `defaultFormRuntime` ;
- `QuestionTypeRegistry` ;
- `ThemeRegistry` ;
- `ValidatorRegistry` ;
- strategie de collision : `error`, `override`, `keep-first`.

Reste a faire :

- ajouter un exemple complet de question custom dans README ou `examples/custom-question`;
- clarifier le contrat exact de `QuestionTypeDefinition`;
- ajouter tests de collisions sur registres ;
- brancher des validateurs globaux `runtime.validators` dans la validation de soumission si besoin applicatif.

---

### Lot 4 — Types de questions V1

Etat : **fait, a enrichir cote edition**.

Livre :

- `short-text` ;
- `long-text` ;
- `yes-no` ;
- `single-choice` ;
- `multiple-choice` ;
- `dropdown` ;
- `number` ;
- `date` ;
- `linear-scale` ;
- `rating` ;
- `statement`.

Reste a faire :

- renforcer les schemas de config par type avec Zod dedie ;
- separer les editors par type au lieu d'un inspector generique ;
- ajouter tests de validation pour chaque type ;
- ajouter messages d'erreur localises par type ;
- ajouter preview compact des options dans le canvas ;
- ajouter edition ergonomique des options avec boutons ajouter/supprimer au lieu d'un textarea `value | label`.

---

### Lot 5 — FormRunner participant

Etat : **fait**.

Livre :

- `FormRunner` ;
- `FormPageRenderer` ;
- `FormElementRenderer` ;
- `QuestionRenderer` ;
- navigation paginee ;
- mode `single-page` ;
- reponses controlees et non controlees ;
- validation avant submit ;
- theme CSS applique via tokens.

Reste a faire :

- ameliorer le focus de la premiere erreur : cibler l'input réel, pas seulement le message ;
- ajouter tests React de rendu et validation avec Testing Library ;
- verifier accessibilite : fieldset, labels, aria-invalid, aria-describedby ;
- permettre libelles de boutons configurables ;
- ajouter option `readOnly` ou `disabled` si besoin pour preview client.

---

### Lot 6 — JSON de reponses et validation de soumission

Etat : **fait**.

Livre :

- `FormSubmitPayload` ;
- `buildSubmitPayload` ;
- `validateAndBuildSubmitPayload` ;
- `sourceHash` ;
- `submittedAt` ;
- `answers` flat ;
- `pages` ;
- callback `onSubmit` uniquement si validation OK.

Reste a faire :

- figer la regle d'omission/null des questions optionnelles dans la documentation API ;
- ajouter tests de payload pour tous les types de questions ;
- ajouter une option applicative pour inclure explicitement les reponses vides si necessaire.

---

### Lot 7 — FormPreview

Etat : **fait**.

Livre :

- `FormPreview` ;
- rendu via `FormRunner` ;
- fallback debug si invalid ;
- reset ;
- JSON simule ;
- diagnostics visibles.

Reste a faire :

- permettre de masquer le panneau JSON ;
- permettre de fournir des reponses initiales de preview ;
- ajouter test React minimal.

---

### Lot 8 — FormDesigner shell

Etat : **fait**.

Livre :

- `FormDesigner` ;
- topbar avec titre editable ;
- actions injectables par l'application ;
- menu `Formulaire / YAML / Preview` ;
- compilation a chaque changement de source ;
- diagnostics ;
- source controlee ou non controlee ;
- storage optionnel.

Reste a faire :

- exposer un mode controle pour la selection ;
- permettre a l'application de configurer les modes visibles ;
- ajouter callback `onSelectionChange` ;
- ajouter tests React des interactions topbar.

---

### Lot 9 — Canvas designer pages/questions

Etat : **fait, actions avancees a ajouter**.

Livre :

- `DesignerCanvas` ;
- `PageBlock` ;
- `ElementBlock` ;
- selection page/question ;
- titre, description, required ;
- diagnostics inline ;
- empty state.

Reste a faire :

- ajouter boutons dupliquer/supprimer question ;
- ajouter boutons dupliquer/supprimer page ;
- ajouter reorder pages/questions ;
- ameliorer l'affichage des differents types de questions ;
- ajouter tests de selection et d'etat degrade.

---

### Lot 10 — Palette a droite et ajout d'elements

Etat : **fait**.

Livre :

- `QuestionPalette` ;
- liste dynamique des types du runtime ;
- ajout apres l'element selectionne ;
- ajout en fin de page active ;
- ajout de page ;
- generation d'ids uniques ;
- mutations YAML structurees.

Reste a faire :

- extraire `PaletteItem` pour personnalisation ;
- ajouter categories de questions ;
- permettre de masquer certains types via options designer ;
- ajouter drag depuis palette si besoin ;
- ajouter tests unitaires pour ajout dans pages vides/degradees.

---

### Lot 11 — Inspectors et edition des questions

Etat : **fait, ergonomie a ameliorer**.

Livre :

- `FormInspector` ;
- edition formulaire ;
- edition page ;
- edition question ;
- titre, description, required ;
- options ;
- validations texte/nombre ;
- config `linear-scale` et `rating`.

Reste a faire :

- decouper en `FormInspector`, `PageInspector`, `QuestionInspector` ;
- creer `QuestionEditor` par type ;
- remplacer le textarea d'options par une liste editable ;
- ajouter erreurs inline dans l'inspector ;
- ajouter edition du theme ;
- ajouter edition de `navigation.mode` ;
- ajouter tests React.

---

### Lot 12 — Mode YAML avec diagnostics localises

Etat : **fait sans CodeMirror**.

Livre :

- `FormYamlEditor` ;
- textarea YAML ;
- diagnostics localises ;
- clic diagnostic qui selectionne la range ;
- YAML invalide sans ecran blanc.

Reste a faire :

- integrer CodeMirror 6 ;
- mapper diagnostics vers decorations ;
- afficher vagues rouges ;
- afficher tooltip au hover ;
- ajouter raccourcis clavier utiles ;
- ajouter tests de mapping diagnostics -> editor.

---

### Lot 13 — Sauvegarde locale, versions et recovery

Etat : **fait, a durcir**.

Livre :

- `FormDesignerPersistenceAdapter` ;
- `LocalStorageFormDesignerPersistenceAdapter` ;
- autosave draft ;
- recovery au montage ;
- versions manuelles ;
- liste versions ;
- restore version ;
- delete version ;
- storage optionnel via `storage={false}`.

Reste a faire :

- sauvegarder automatiquement la derniere version valide ;
- pruner versions par age et taille, pas seulement par nombre ;
- remonter diagnostics de storage : quota exceeded, JSON corrompu, storage indisponible ;
- ajouter UI de comparaison de version si besoin ;
- ajouter tests de recovery dans composant React.

---

### Lot 14 — Themes et styles

Etat : **fait pour V1 runtime**.

Livre :

- tokens de theme ;
- themes `qastia-light` et `coaching` ;
- application CSS variables au runner ;
- styles runner ;
- styles designer ;
- styles diagnostics ;
- styles palette ;
- styles versions.

Reste a faire :

- verifier visuellement mobile/desktop ;
- ajouter theming du designer uniquement si option explicite ;
- ajouter selector de theme dans l'exemple ;
- ajouter designer de theme post-V1 ;
- auditer contraste et accessibilite.

---

### Lot 15 — Exemple integre

Etat : **fait, scenario a enrichir**.

Livre :

- `examples/integrated` ;
- source YAML exemple ;
- `FormDesigner` controle ;
- action `Reinitialiser` injectee ;
- preview ;
- autosave ;
- versions ;
- recovery ;
- error boundary.

Reste a faire :

- ajouter un selecteur de theme dans l'exemple ;
- ajouter un bouton qui injecte volontairement une erreur YAML ;
- ajouter un exemple de question custom ;
- ajouter une page/document d'integration avec `qastia-coaching` ;
- deployer l'exemple sur GitHub Pages si souhaite.

---

### Lot 16 — Tests package et CI

Etat : **fait, couverture a etendre**.

Livre :

- tests compilateur ;
- tests storage ;
- tests mutations designer ;
- `test:package` ;
- smoke test du package builde ;
- workflow GitHub Actions ;
- build example en CI ;
- publication GitHub Packages.

Reste a faire :

- ajouter tests React runner ;
- ajouter tests React designer ;
- ajouter tests accessibility de base ;
- ajouter tests sur tous les types de questions ;
- ajouter un job `npm audit` si souhaite ;
- ajouter Pages deploy pour l'exemple si souhaite.

---

### Lot 17 — Stabilisation API publique

Etat : **fait**.

Livre :

- entrypoints :
  - racine ;
  - `./compiler` ;
  - `./runtime` ;
  - `./runner` ;
  - `./preview` ;
  - `./designer` ;
  - `./storage` ;
  - `./styles.css` ;
- `publicTypes.ts` ;
- `FORM_RUNTIME_PUBLIC_API_VERSION` ;
- README d'usage.
- selection designer controlee ;
- modes designer configurables ;
- props principales documentees ;
- helper de test interne retire des exports ;
- smoke test par les entrypoints publics reels du package ;
- verification qu'un deep import interne est bloque par `package.exports` ;
- smoke test Vite consommateur sur les entrypoints runner/compiler/runtime ;
- verification du bundle consommateur : le runner seul ne charge pas le designer cote JS ;
- build local de `/home/bjalon/projects/qastia/qastia-coaching` avec `@bjalon/form-runtime` en dependance `file:../qastia-questionnaire`.

Reste a faire avant tag V1 :

- decider si les types `Raw*` restent dans l'API publique V1 ;
- refaire une passe fonctionnelle dans `qastia-coaching` quand l'ecran final d'integration sera cable ;
- lancer la publication GitHub Packages sur tag.

---

### Lot 18 — Evolutions post-V1

Etat : **documente**.

Document dedie :

```txt
documents/evolutions-post-v1.md
```

Reste a faire :

- prioriser les evolutions avec les besoins reels de `qastia-coaching` ;
- decider ce qui doit entrer en V1.1, V1.2, etc. ;
- ne pas melanger ces sujets avec la stabilisation V1.

---

## 4. Reste a faire priorise

### Priorite 1 — Stabilisation avant publication V1

- Relire API publique et entrypoints.
- Ajouter tests React minimaux :
  - `FormRunner` submit OK/KO ;
  - `FormDesigner` changement de titre ;
  - palette ajout question ;
  - inspector modification question.
- Decider si les types `Raw*` restent publics pour V1.
- Faire une passe fonctionnelle dans `qastia-coaching` quand l'ecran consommateur final sera cable.
- Publier sur GitHub Packages via tag.

### Priorite 2 — Robustesse edition

- Integrer CodeMirror 6.
- Ajouter decorations de diagnostics dans le YAML.
- Ajouter erreurs inline dans inspector.
- Ajouter UI d'options en liste editable.
- Ajouter suppression/duplication de pages/questions.
- Ajouter derniere version valide automatique.
- Gerer erreurs storage visibles dans l'UI.

### Priorite 3 — Ergonomie et qualite produit

- Verifier responsive mobile/tablette/desktop.
- Auditer accessibilite du runner.
- Ajouter selecteur de theme dans l'exemple.
- Ajouter example de question custom.
- Ajouter documentation d'integration `qastia-coaching`.
- Deployer exemple integre sur GitHub Pages.

### Priorite 4 — Post-V1

- Logique conditionnelle.
- Scoring.
- Types avances : email, telephone, URL, NPS, fichier, signature.
- Assets et medias.
- Export CSV/XLSX/PDF.
- Backend adapters.
- Internationalisation.

---

## 5. Definition de done V1

La V1 peut etre taggee quand :

- `npm run typecheck` passe ;
- `npm test` passe ;
- `npm run test:package` passe ;
- `npm run build` passe ;
- `npm run build:example` passe ;
- une app Vite consommateur consomme le package ;
- `qastia-coaching` build avec le package localement ;
- les props publiques principales sont documentees ;
- les exports publics sont relus ;
- le stockage local recovery fonctionne dans l'exemple ;
- le runner produit un JSON stable ;
- la publication GitHub Packages est validee sur tag.

---

## 6. Risques restants

### API publique trop large

Risque : exposer des types ou helpers internes oblige a les maintenir.

Action : relire `publicTypes.ts`, `src/index.ts`, `src/designer.ts`, `src/storage.ts`.

### Diagnostics YAML incomplets

Risque : ranges approximatives sur YAML complexe.

Action : ajouter tests de source map et integrer CodeMirror apres stabilisation.

### Designer encore trop monolithique

Risque : `FormDesigner` concentre trop d'etat.

Action : extraire state/reducer si les interactions avancent : suppression, duplication, reorder, undo.

### Storage local fragile

Risque : quota, JSON corrompu, storage indisponible.

Action : remonter des resultats typés et afficher les erreurs storage dans l'UI.

### Integration `qastia-coaching`

Risque : les besoins reels de stockage, permissions et routing imposent des ajustements API.

Action : build local valide avec la dependance `file:../qastia-questionnaire`. Refaire une passe produit quand l'ecran consommateur final sera cable.
