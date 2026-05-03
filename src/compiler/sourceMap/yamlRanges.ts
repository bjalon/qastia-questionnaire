import type { SourceRange } from "../../publicTypes";
import { rangeFromOffsets } from "../sourceRanges";

type SourceLine = {
  readonly index: number;
  readonly startOffset: number;
  readonly text: string;
  readonly indent: number;
  readonly trimmed: string;
};

export function rangeForPath(source: string, path: readonly string[]): SourceRange | undefined {
  if (path.length === 0) {
    return rangeFromOffsets(source, 0, Math.min(source.length, firstLineLength(source)));
  }

  const lines = source
    .split(/\n/)
    .map<SourceLine>((text, index, allLines) => ({
      index,
      startOffset: offsetForLine(allLines, index),
      text,
      indent: countIndent(text),
      trimmed: text.trim(),
    }))
    .filter((line) => line.trimmed.length > 0 && !line.trimmed.startsWith("#"));

  const match = findPath(lines, 0, lines.length, 0, path);
  if (!match) {
    return undefined;
  }

  return rangeForLineToken(source, match.line, match.token);
}

function findPath(
  lines: readonly SourceLine[],
  start: number,
  end: number,
  indent: number,
  path: readonly string[],
): { readonly line: SourceLine; readonly token: string } | undefined {
  const [head, ...tail] = path;
  if (head === undefined) {
    return undefined;
  }

  if (isArrayIndex(head)) {
    const item = findSequenceItem(lines, start, end, indent, Number(head));
    if (!item) {
      return undefined;
    }

    if (tail.length === 0) {
      return { line: item.line, token: "-" };
    }

    const inlineToken = inlineSequenceToken(item.line, tail[0]);
    if (inlineToken && tail.length === 1) {
      return { line: item.line, token: inlineToken };
    }

    return findPath(lines, item.childStart, item.childEnd, item.line.indent + 2, tail);
  }

  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (!line || line.indent < indent) {
      break;
    }
    if (line.indent !== indent) {
      continue;
    }
    if (!startsWithMappingKey(line, head)) {
      continue;
    }

    if (tail.length === 0) {
      return { line, token: head };
    }

    return findPath(lines, index + 1, blockEnd(lines, index + 1, end, indent), indent + 2, tail);
  }

  return undefined;
}

function findSequenceItem(
  lines: readonly SourceLine[],
  start: number,
  end: number,
  indent: number,
  targetIndex: number,
): {
  readonly line: SourceLine;
  readonly childStart: number;
  readonly childEnd: number;
} | undefined {
  let itemIndex = -1;

  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (!line || line.indent < indent) {
      break;
    }
    if (line.indent !== indent || !line.trimmed.startsWith("-")) {
      continue;
    }

    itemIndex += 1;
    if (itemIndex !== targetIndex) {
      continue;
    }

    return {
      line,
      childStart: index + 1,
      childEnd: nextSequenceItemOrBlockEnd(lines, index + 1, end, indent),
    };
  }

  return undefined;
}

function nextSequenceItemOrBlockEnd(
  lines: readonly SourceLine[],
  start: number,
  end: number,
  indent: number,
): number {
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (!line || line.indent < indent) {
      return index;
    }
    if (line.indent === indent && line.trimmed.startsWith("-")) {
      return index;
    }
  }

  return end;
}

function blockEnd(lines: readonly SourceLine[], start: number, end: number, parentIndent: number): number {
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (line && line.indent <= parentIndent) {
      return index;
    }
  }

  return end;
}

function startsWithMappingKey(line: SourceLine, key: string): boolean {
  return new RegExp(`^${escapeRegExp(key)}\\s*:`).test(line.trimmed);
}

function inlineSequenceToken(line: SourceLine, key: string | undefined): string | undefined {
  if (!key) {
    return undefined;
  }

  return new RegExp(`^-\\s+${escapeRegExp(key)}\\s*:`).test(line.trimmed) ? key : undefined;
}

function rangeForLineToken(source: string, line: SourceLine, token: string): SourceRange {
  const column = Math.max(0, line.text.indexOf(token));
  const startOffset = line.startOffset + column;
  return rangeFromOffsets(source, startOffset, startOffset + token.length);
}

function firstLineLength(source: string): number {
  const newlineIndex = source.indexOf("\n");
  return newlineIndex >= 0 ? newlineIndex : source.length;
}

function offsetForLine(lines: readonly string[], lineIndex: number): number {
  let offset = 0;
  for (let index = 0; index < lineIndex; index += 1) {
    offset += lines[index]?.length ?? 0;
    offset += 1;
  }
  return offset;
}

function countIndent(value: string): number {
  const match = /^ */.exec(value);
  return match?.[0].length ?? 0;
}

function isArrayIndex(value: string): boolean {
  return /^\d+$/.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
