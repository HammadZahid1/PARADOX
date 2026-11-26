import { describe, expect, it } from 'vitest';
import { formatTooltipRows } from '@/ui/chartUtils/tooltip';

describe('formatTooltipRows', () => {
  it('formats labels, values, and provenance text', () => {
    const rows = formatTooltipRows([
      { label: ' Peak ', value: 1234, source: 'Monte Carlo', sampleCount: 5 },
    ]);
    expect(rows).toEqual([{
      label: 'Peak',
      value: '1.2K',
      provenance: 'Monte Carlo · 5 samples',
    }]);
  });

  it('handles explicit, singular, source-only, and count-only provenance', () => {
    const rows = formatTooltipRows([
      { label: 'A', value: 1, provenance: 'Run 42', source: 'ignored', sampleCount: 9 },
      { label: 'B', value: 2, source: 'Run 43', sampleCount: 1 },
      { label: 'C', value: 3, source: 'Run 44' },
      { label: 'D', value: 4, sampleCount: 2 },
    ]);
    expect(rows.map((row) => row.provenance)).toEqual([
      'Run 42',
      'Run 43 · 1 sample',
      'Run 44',
      '2 samples',
    ]);
  });

  it('skips invalid values and blank labels', () => {
    const rows = formatTooltipRows([
      { label: '', value: 1 },
      { label: 'NaN', value: Number.NaN },
      { label: 'Infinity', value: Number.POSITIVE_INFINITY },
      { label: 'Valid', value: 10 },
    ]);
    expect(rows).toEqual([{ label: 'Valid', value: '10.0', provenance: '' }]);
  });

  it('honours formatting options and row limits', () => {
    const entries = [
      { label: 'A', value: 1234, source: 'A source' },
      { label: 'B', value: 2345, source: 'B source' },
    ];
    expect(formatTooltipRows(entries, { precision: 0 }).map((row) => row.value)).toEqual(['1K', '2K']);
    expect(formatTooltipRows(entries, { formatValue: (value) => `#${value}` }).map((row) => row.value))
      .toEqual(['#1234', '#2345']);
    expect(formatTooltipRows(entries, { includeProvenance: false }).map((row) => row.provenance))
      .toEqual(['', '']);
    expect(formatTooltipRows(entries, { maxRows: 1 }).map((row) => row.label)).toEqual(['A']);
    expect(formatTooltipRows(entries, { maxRows: 0 })).toEqual([]);
  });

  it('handles empty input and preserves input order', () => {
    expect(formatTooltipRows([])).toEqual([]);
    const entries = [{ label: 'Z', value: 1 }, { label: 'A', value: 2 }];
    expect(formatTooltipRows(entries)).toEqual(formatTooltipRows(entries));
    expect(formatTooltipRows(entries).map((row) => row.label)).toEqual(['Z', 'A']);
  });
});
