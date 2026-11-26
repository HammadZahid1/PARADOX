import { describe, expect, it } from 'vitest';
import * as analyticsExtra from './index';

describe('analyticsExtra barrel', () => {
  it('re-exports all public functions', () => {
    const functions: (keyof typeof analyticsExtra)[] = [
      'summarizeSeries',
      'simpleMovingAverage',
      'exponentialMovingAverage',
      'crossCorrelation',
      'classifyTrend',
      'detectOutliers',
      'categoricalEntropy',
      'computeEventRates',
      'firstUpwardCrossing',
      'firstDownwardCrossing',
      'approximateSobolIndices',
      'sortRowsByColumn',
      'escapeMarkdownCell',
      'renderMarkdownReport',
    ];
    for (const name of functions) expect(typeof analyticsExtra[name]).toBe('function');
  });

  it('exposes working implementations through the barrel', () => {
    expect(analyticsExtra.summarizeSeries([1, 2, 3]).mean).toBe(2);
    expect(analyticsExtra.categoricalEntropy(['a', 'a'])).toBe(0);
    expect(analyticsExtra.renderMarkdownReport([])).toBe('');
  });
});
