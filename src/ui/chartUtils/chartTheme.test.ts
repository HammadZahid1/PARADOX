import { describe, expect, it } from 'vitest';
import { assignSeriesColors, chartTheme } from '@/ui/chartUtils/chartTheme';

describe('chartTheme', () => {
  it('exposes typed colour tokens', () => {
    expect(chartTheme.grid).toBe('#252d38');
    expect(chartTheme.muted).toBe('#7d8896');
    expect(chartTheme.series).toContain('#3ddbd9');
    expect(chartTheme.series.length).toBeGreaterThan(1);
  });

  it('assigns stable colours regardless of key order', () => {
    const forward = assignSeriesColors(['beta', 'alpha']);
    const reverse = assignSeriesColors(['alpha', 'beta']);
    expect(forward).toEqual(reverse);
    expect(Object.keys(forward)).toEqual(['alpha', 'beta']);
  });

  it('keeps duplicate keys and skips empty keys', () => {
    const colors = assignSeriesColors(['a', 'a', '', '   ']);
    expect(Object.keys(colors)).toEqual(['a']);
    expect(assignSeriesColors(['a'])).toEqual(colors);
  });

  it('assigns unique palette colours for distinct keys', () => {
    const colors = assignSeriesColors(['series-a', 'series-b', 'series-c', 'series-d']);
    const values = Object.values(colors);
    expect(new Set(values).size).toBe(values.length);
    for (const color of values) {
      expect(chartTheme.series).toContain(color);
    }
  });

  it('is stable across repeated calls with a custom theme', () => {
    const theme = { ...chartTheme, series: ['#111111'] };
    expect(assignSeriesColors(['x', 'y'], theme)).toEqual(assignSeriesColors(['x', 'y'], theme));
  });
});
