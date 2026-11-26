import { describe, expect, it } from 'vitest';
import { escapeMarkdownCell, renderMarkdownReport, type ResultGroup } from './markdownReport';

describe('escapeMarkdownCell', () => {
  it('escapes pipes, backslashes and newlines and stringifies numbers', () => {
    expect(escapeMarkdownCell('a|b')).toBe('a\\|b');
    expect(escapeMarkdownCell('x\\y')).toBe('x\\\\y');
    expect(escapeMarkdownCell('one\ntwo')).toBe('one<br>two');
    expect(escapeMarkdownCell('one\rtwo')).toBe('one<br>two');
    expect(escapeMarkdownCell(7)).toBe('7');
  });
});

describe('renderMarkdownReport', () => {
  it('renders titled table groups with exact formatting', () => {
    const groups: ResultGroup[] = [
      { title: 'Summary', headers: ['Metric', 'Value'], rows: [['Count', 5], ['Mean', 3]] },
      { title: 'Rates', headers: ['Type', 'Per 1000'], rows: [['alpha', 250]] },
    ];
    expect(renderMarkdownReport(groups)).toBe(
      '## Summary\n\n| Metric | Value |\n| --- | --- |\n| Count | 5 |\n| Mean | 3 |' +
        '\n\n## Rates\n\n| Type | Per 1000 |\n| --- | --- |\n| alpha | 250 |',
    );
  });

  it('escapes titles, headers and cells', () => {
    const report = renderMarkdownReport([
      { title: 'A|B', headers: ['head\\er'], rows: [['line1\nline2']] },
    ]);
    expect(report).toBe('## A\\|B\n\n| head\\\\er |\n| --- |\n| line1<br>line2 |');
  });

  it('pads short rows, ignores extra cells and renders heading-only groups', () => {
    const report = renderMarkdownReport([
      { title: 'Padded', headers: ['A', 'B'], rows: [['only', 'extra', 'ignored']] },
      { title: 'No table', headers: [], rows: [] },
    ]);
    expect(report).toBe('## Padded\n\n| A | B |\n| --- | --- |\n| only | extra |\n\n## No table');
  });

  it('renders an empty report for no groups', () => {
    expect(renderMarkdownReport([])).toBe('');
  });
});
