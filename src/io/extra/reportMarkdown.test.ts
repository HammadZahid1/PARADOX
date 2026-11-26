import { describe, expect, it } from 'vitest';
import {
  escapeMarkdownCell,
  renderReportMarkdown,
  type SimulationReport,
} from './reportMarkdown';

const report: SimulationReport = {
  metadata: {
    title: 'Scenario *Alpha*',
    scenarioName: 'Alpha | Beta',
    seed: 42,
    steps: 10,
    generatedBy: 'PARADOX',
    tags: ['demo', 'v1'],
  },
  summary: 'Line one\nLine two',
  metrics: [
    { name: 'Population', value: 1200, unit: 'people', delta: 20 },
    { name: 'Flag', value: true },
  ],
  events: [
    { step: 2, name: 'Event | one', severity: 'warning', detail: 'a\\b' },
  ],
};

describe('simulation report Markdown', () => {
  it('renders metadata, summary, tables and events', () => {
    const markdown = renderReportMarkdown(report);
    expect(markdown.startsWith('# Scenario \\*Alpha\\*\n')).toBe(true);
    expect(markdown).toContain('- Scenario: Alpha \\| Beta');
    expect(markdown).toContain('- Seed: 42');
    expect(markdown).toContain('## Summary\n\nLine one\nLine two');
    expect(markdown).toContain('| Metric | Value | Delta |');
    expect(markdown).toContain('| Population | 1200 people | +20 |');
    expect(markdown).toContain('| Flag | true | — |');
  });

  it('escapes table delimiters, newlines and markdown markers', () => {
    expect(escapeMarkdownCell('a|b\nc*d')).toBe('a\\|b<br>c\\*d');
    const markdown = renderReportMarkdown(report);
    expect(markdown).not.toContain('| Event | one |');
    expect(markdown).toContain('| 2 | Event \\| one | warning | a\\\\b |');
  });

  it('renders empty sections and non-finite values safely', () => {
    const markdown = renderReportMarkdown({
      metadata: { title: 'Empty', scenarioName: 'None', seed: 0, steps: 0 },
      metrics: [],
      events: [],
    });
    expect(markdown).toContain('_No metrics recorded._');
    expect(markdown).toContain('_No events recorded._');
    expect(markdown).not.toContain('## Summary');
    expect(
      renderReportMarkdown({
        metadata: { title: 'X', scenarioName: 'Y', seed: Number.NaN, steps: 1 },
        metrics: [{ name: 'Bad', value: Number.POSITIVE_INFINITY, delta: Number.NaN }],
      }),
    ).toContain('| Bad | n/a | n/a |');
  });

  it('is deterministic for the same report', () => {
    expect(renderReportMarkdown(report)).toBe(renderReportMarkdown(report));
    expect(renderReportMarkdown(report).endsWith('\n')).toBe(true);
  });
});
