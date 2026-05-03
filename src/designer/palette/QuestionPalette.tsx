import type React from "react";
import type { FormRuntime } from "../../publicTypes";

export type QuestionPaletteProps = {
  readonly runtime: FormRuntime;
  readonly onAddQuestion: (questionTypeId: string) => void;
  readonly onAddPage: () => void;
};

export function QuestionPalette({
  runtime,
  onAddQuestion,
  onAddPage,
}: QuestionPaletteProps): React.ReactElement {
  return (
    <section className="qf-designer-panel">
      <header>
        <h2>Palette</h2>
      </header>
      <div className="qf-palette-list">
        {Array.from(runtime.questionTypes.values()).map((definition) => (
          <button key={definition.id} type="button" onClick={() => onAddQuestion(definition.id)}>
            <strong>{definition.label}</strong>
            <span>{definition.description}</span>
          </button>
        ))}
        <button type="button" className="qf-page-add" onClick={onAddPage}>
          <strong>Saut de page</strong>
          <span>Ajouter une nouvelle page après la sélection.</span>
        </button>
      </div>
    </section>
  );
}
