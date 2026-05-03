import type React from "react";

export type FormNavigationProps = {
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly canSubmit: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
};

export function FormNavigation({
  pageIndex,
  pageCount,
  canSubmit,
  onPrevious,
  onNext,
}: FormNavigationProps): React.ReactElement {
  const isFirst = pageIndex === 0;
  const isLast = pageIndex >= pageCount - 1;

  return (
    <footer className="qf-navigation">
      <button type="button" onClick={onPrevious} disabled={isFirst}>
        Precedent
      </button>
      <span>
        {pageIndex + 1} / {pageCount}
      </span>
      {isLast ? (
        <button type="submit" className="qf-primary" disabled={!canSubmit}>
          Envoyer
        </button>
      ) : (
        <button type="button" className="qf-primary" onClick={onNext}>
          Suivant
        </button>
      )}
    </footer>
  );
}
