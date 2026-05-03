# Evolutions post-V1 — `@bjalon/form-runtime`

Ce document liste les evolutions volontairement gardees hors du socle V1.

## Logique conditionnelle

Afficher ou masquer une question, un element ou une page selon une reponse precedente.

```yaml
visibleIf:
  question: clarity
  lessThan: 3
```

Cas d'usage :

- demander un commentaire si une note est faible ;
- afficher une page seulement pour certains roles ;
- sauter des questions non pertinentes.

## Scoring

Ajouter une logique de score exploitable par l'application hote.

- score par option ;
- score par question ;
- score total ;
- feedback final conditionnel.

## Types avances

Types envisages :

- email ;
- telephone ;
- URL ;
- NPS ;
- consentement ;
- fichier ;
- signature ;
- grille ;
- classement.

## Assets et medias

Ajouter un resolver d'assets similaire a celui de `@bjalon/deck-runtime`.

Cas d'usage :

- logo de formulaire ;
- images dans les pages ;
- documents ou ressources associes a une question.

## Import / export

Formats envisages :

- export CSV des reponses ;
- export XLSX ;
- export PDF du questionnaire ;
- export JSON Schema ;
- import JSON structure.

## Adapters backend

La V1 expose deja `onSubmit` et des adapters de stockage designer. Les adapters backend restent applicatifs, mais des helpers pourront etre fournis :

- REST ;
- Firebase ;
- Supabase ;
- adapter custom typable.

## Designer avance

Pistes :

- drag and drop pages/questions ;
- undo/redo ;
- duplication/suppression depuis canvas ;
- edition de theme ;
- templates de questionnaires ;
- preview responsive ;
- permissions par role.
