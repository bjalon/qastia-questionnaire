export type SourcePosition = {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
};

export type SourceRange = {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
};
