/** Cell values accepted by the Markdown renderer. */
export type MarkdownCell = string | number;

/** A titled table group in an analytics report. */
export interface ResultGroup {
  title: string;
  headers: readonly string[];
  rows: readonly (readonly MarkdownCell[])[];
}

/** Escape backslashes, pipes and newlines so a value stays inside one cell. */
export function escapeMarkdownCell(value: MarkdownCell): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r\n|\n|\r/g, '<br>');
}

/**
 * Render titled result groups as Markdown tables. Groups with no headers
 * render as a heading only; short rows are padded and extra cells are ignored.
 * An empty group list renders as an empty string.
 */
export function renderMarkdownReport(groups: readonly ResultGroup[]): string {
  const sections: string[] = [];
  for (const group of groups) {
    const lines: string[] = [`## ${escapeMarkdownCell(group.title)}`];
    if (group.headers.length > 0) {
      lines.push('');
      lines.push(`| ${group.headers.map(escapeMarkdownCell).join(' | ')} |`);
      lines.push(`| ${group.headers.map(() => '---').join(' | ')} |`);
      for (const row of group.rows) {
        const cells = group.headers.map((_, index) => escapeMarkdownCell(row[index] ?? ''));
        lines.push(`| ${cells.join(' | ')} |`);
      }
    }
    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n');
}
