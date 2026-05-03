import type React from "react";

export type FormProgressProps = {
  readonly pageIndex: number;
  readonly pageCount: number;
};

export function FormProgress({ pageIndex, pageCount }: FormProgressProps): React.ReactElement {
  const progress = pageCount <= 0 ? 0 : Math.round(((pageIndex + 1) / pageCount) * 100);

  return (
    <div className="qf-progress" aria-label={`Progression ${progress}%`}>
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}
