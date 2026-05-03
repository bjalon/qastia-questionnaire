import { Component, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  FormDesigner,
  defaultFormRuntime,
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

function IntegratedExample(): React.ReactElement {
  const [source, setSource] = useState<FormSource>(initialSource);

  return (
    <main className="example-shell">
      <section className="designer-example">
        <FormDesigner
          source={source}
          runtime={defaultFormRuntime}
          actions={
            <button type="button" onClick={() => setSource(initialSource)}>
              Réinitialiser
            </button>
          }
          onSourceChange={(event) => setSource(event.source)}
          options={{ showDiagnostics: true }}
        />
      </section>
    </main>
  );
}

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
