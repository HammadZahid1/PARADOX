import { describe, expect, it } from 'vitest';
import { fitLinearRegression, predictLinearRegression } from './regression';

describe('fitLinearRegression', () => {
  it('recovers slope, intercept and a perfect fit from a linear series', () => {
    const samples = [0, 1, 2, 3].map((step) => ({ step, value: 5 + 2 * step }));
    const model = fitLinearRegression(samples);
    expect(model).toEqual({ count: 4, slope: 2, intercept: 5, r2: 1 });
    expect(predictLinearRegression(model, 10)).toBe(25);
  });

  it('fits a downward trend and reports an imperfect fit for noisy samples', () => {
    const model = fitLinearRegression([
      { step: 0, value: 10 },
      { step: 1, value: 8 },
      { step: 2, value: 5 },
      { step: 3, value: 4 },
    ]);
    expect(model.slope).toBeCloseTo(-2.1, 10);
    expect(model.intercept).toBeCloseTo(9.9, 10);
    expect(model.r2).toBeGreaterThan(0.9);
    expect(model.r2).toBeLessThan(1);
    expect(predictLinearRegression(model, 0)).toBeCloseTo(model.intercept, 10);
  });

  it('ignores non-finite samples and handles empty, single and constant-step inputs', () => {
    expect(fitLinearRegression([{ step: 0, value: Number.NaN }, { step: 1, value: Infinity }])).toEqual({
      count: 0, slope: 0, intercept: 0, r2: 0,
    });
    expect(fitLinearRegression([{ step: 3, value: 7 }])).toEqual({ count: 1, slope: 0, intercept: 7, r2: 0 });
    expect(fitLinearRegression([{ step: 1, value: 2 }, { step: 1, value: 4 }])).toEqual({
      count: 2, slope: 0, intercept: 3, r2: 0,
    });
    expect(fitLinearRegression([{ step: 0, value: 5 }, { step: 1, value: 5 }])).toEqual({
      count: 2, slope: 0, intercept: 5, r2: 0,
    });
  });

  it('falls back to the intercept for a non-finite prediction step', () => {
    const model = fitLinearRegression([{ step: 0, value: 1 }, { step: 1, value: 3 }]);
    expect(predictLinearRegression(model, Number.NaN)).toBe(model.intercept);
  });
});
