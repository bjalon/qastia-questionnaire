import type React from "react";

export type FormNavigationProps = {
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly canSubmit: boolean;
  readonly labels: FormNavigationLabels;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
};

export type FormNavigationLabels = {
  readonly previous: string;
  readonly next: string;
  readonly submit: string;
};

export function FormNavigation({
  pageIndex,
  pageCount,
  canSubmit,
  labels,
  onPrevious,
  onNext,
}: FormNavigationProps): React.ReactElement {
  const isFirst = pageIndex === 0;
  const isLast = pageIndex >= pageCount - 1;

  return (
    <footer className="qf-navigation">
      <button type="button" onClick={onPrevious} disabled={isFirst}>
        {labels.previous}
      </button>
      <span>
        {pageIndex + 1} / {pageCount}
      </span>
      {isLast ? (
        <button type="submit" className="qf-primary" disabled={!canSubmit}>
          {labels.submit}
        </button>
      ) : (
        <button type="button" className="qf-primary" onClick={onNext}>
          {labels.next}
        </button>
      )}
    </footer>
  );
}
