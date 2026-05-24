/**
 * Returns true if matchIndex is on a `//` single-line comment or inside a
 * `/* block comment *\/`.
 */
export function isInsideComment(content: string, matchIndex: number): boolean {
  const lineStart = content.lastIndexOf('\n', matchIndex - 1) + 1;
  const lineUpToMatch = content.slice(lineStart, matchIndex);
  // Line comment: // appearing before the match (outside any string)
  if (/(?:^|\s)\/\//.test(lineUpToMatch)) return true;
  // Block comment: rough heuristic — count /* and */ before matchIndex
  const before = content.slice(0, matchIndex);
  const opens = (before.match(/\/\*/g) || []).length;
  const closes = (before.match(/\*\//g) || []).length;
  return opens > closes;
}

/**
 * Returns true if the character at matchIndex appears to be inside a quoted
 * string literal (single quote, double quote, or template literal) on the
 * same logical line. Handles single-level escaping.
 */
export function isInsideStringLiteral(content: string, matchIndex: number): boolean {
  const lineStart = content.lastIndexOf('\n', matchIndex - 1) + 1;
  const lineUpToMatch = content.slice(lineStart, matchIndex);

  let inSingleQ = false;
  let inDoubleQ = false;
  let inBacktick = false;

  for (let i = 0; i < lineUpToMatch.length; i++) {
    const c = lineUpToMatch[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === "'" && !inDoubleQ && !inBacktick) inSingleQ = !inSingleQ;
    else if (c === '"' && !inSingleQ && !inBacktick) inDoubleQ = !inDoubleQ;
    else if (c === '`' && !inSingleQ && !inDoubleQ) inBacktick = !inBacktick;
  }

  return inSingleQ || inDoubleQ || inBacktick;
}

/** Returns true if the match should be skipped (in a string or comment). */
export function isInCodeContext(content: string, matchIndex: number): boolean {
  return !isInsideStringLiteral(content, matchIndex) && !isInsideComment(content, matchIndex);
}

/** Returns the 1-based line number of matchIndex in content. */
export function lineNumberAt(content: string, matchIndex: number): number {
  return content.slice(0, matchIndex).split('\n').length;
}
