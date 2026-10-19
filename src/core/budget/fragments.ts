export type TextFragment = {
  text: string;
  x: number;
  y: number;
  width: number;
  page: number;
};

export type TextLine = {
  page: number;
  y: number;
  fragments: TextFragment[];
};

/** Agrupa fragmentos de una misma fila. `tolerance` es la diferencia máxima de Y. */
export function groupLines(fragments: TextFragment[], tolerance = 2): TextLine[] {
  const sorted = [...fragments].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];

  for (const fragment of sorted) {
    const current = lines.at(-1);
    if (
      current &&
      current.page === fragment.page &&
      Math.abs(current.y - fragment.y) <= tolerance
    ) {
      current.fragments.push(fragment);
      continue;
    }
    lines.push({ page: fragment.page, y: fragment.y, fragments: [fragment] });
  }

  for (const line of lines) {
    line.fragments.sort((a, b) => a.x - b.x);
  }
  return lines;
}

export function lineText(line: TextLine): string {
  return line.fragments
    .map((fragment) => fragment.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
