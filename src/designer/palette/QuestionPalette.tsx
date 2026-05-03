import { useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const query = normalize(search);
  const questionTypes = useMemo(
    () =>
      Array.from(runtime.questionTypes.values()).filter((definition) => {
        if (!query) {
          return true;
        }

        return normalize(`${definition.id} ${definition.label} ${definition.description}`).includes(query);
      }),
    [query, runtime],
  );

  return (
    <section className="qf-designer-panel">
      <header>
        <h2>Palette</h2>
      </header>
      <label className="qf-palette-search">
        <span>Recherche</span>
        <input
          type="search"
          value={search}
          placeholder="Rechercher une question"
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </label>
      <div className="qf-palette-list">
        {questionTypes.map((definition) => (
          <button key={definition.id} type="button" onClick={() => onAddQuestion(definition.id)}>
            <strong>{definition.label}</strong>
            <span>{definition.description}</span>
          </button>
        ))}
        {questionTypes.length === 0 ? <p className="qf-palette-empty">Aucun type trouve.</p> : null}
        <button type="button" className="qf-page-add" onClick={onAddPage}>
          <strong>Saut de page</strong>
          <span>Ajouter une nouvelle page après la sélection.</span>
        </button>
      </div>
    </section>
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim();
}
