import type { SourceRange } from "../publicTypes";

export function rangeForNeedle(source: string, needle: string): SourceRange | undefined {
  const offset = source.indexOf(needle);
  if (offset < 0) {
    return undefined;
  }

  return rangeFromOffsets(source, offset, offset + needle.length);
}

export function rangeFromOffsets(source: string, startOffset: number, endOffset: number): SourceRange {
  return {
    start: positionFromOffset(source, startOffset),
    end: positionFromOffset(source, endOffset),
  };
}

function positionFromOffset(source: string, offset: number): SourceRange["start"] {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let column = 1;

  for (let index = 0; index < safeOffset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return {
    offset: safeOffset,
    line,
    column,
  };
}
