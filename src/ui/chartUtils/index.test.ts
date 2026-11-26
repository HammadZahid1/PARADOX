import { describe, expect, it } from 'vitest';
import * as chartUtils from '@/ui/chartUtils';
import type { AxisTick, HistogramBin } from '@/ui/chartUtils';

const functionNames = [
  'generateAxisTicks',
  'formatCompactNumber',
  'buildPercentileBands',
  'computeHistogram',
  'computeCovariance',
  'computeCorrelation',
  'computeRegression',
  'computeEventDensity',
  'layoutBranchTree',
  'buildLinePath',
  'buildAreaPath',
  'assignSeriesColors',
  'formatTooltipRows',
  'computeForceLayout',
] as const;

describe('chartUtils barrel', () => {
  it('re-exports every public function', () => {
    for (const name of functionNames) {
      expect(typeof chartUtils[name]).toBe('function');
    }
  });

  it('re-exports callable implementations', () => {
    expect(chartUtils.generateAxisTicks([0, 10], 5).map((tick) => tick.value))
      .toEqual([0, 2.5, 5, 7.5, 10]);
    expect(chartUtils.formatCompactNumber(1234, 1)).toBe('1.2K');
    expect(chartUtils.chartTheme.grid).toBe('#252d38');
  });

  it('re-exports public types', () => {
    const tick: AxisTick = { value: 0, label: '0' };
    const bin: HistogramBin = { start: 0, end: 1, count: 1 };
    expect(tick.value).toBe(bin.start);
  });
});
