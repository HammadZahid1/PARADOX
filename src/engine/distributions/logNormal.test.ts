import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/random/rng';
import { createLogNormal, logNormalMoments, logNormalParamsFromMeanStd, logNormalSample } from './logNormal';
import { sampleMany } from './sampler';

const seeded = (seed = 12345): SeededRandom => new SeededRandom(seed);

describe('logNormal', () => {
  it('converts mean/stdDev to mu/sigma and recovers the moments', () => {
    const params = logNormalParamsFromMeanStd(10, 5);
    expect(params.sigma).toBeCloseTo(Math.sqrt(Math.log(1.25)), 12);
    expect(params.mu).toBeCloseTo(Math.log(10) - Math.log(1.25) / 2, 12);

    const moments = logNormalMoments(params.mu, params.sigma);
    expect(moments.mean).toBeCloseTo(10, 10);
    expect(Math.sqrt(moments.variance)).toBeCloseTo(5, 10);
  });

  it('handles zero dispersion and rejects invalid parameters', () => {
    const degenerate = logNormalParamsFromMeanStd(4, 0);
    expect(degenerate.sigma).toBe(0);
    expect(logNormalSample(seeded(), degenerate.mu, degenerate.sigma)).toBeCloseTo(4, 12);

    expect(() => logNormalParamsFromMeanStd(0, 1)).toThrow(RangeError);
    expect(() => logNormalParamsFromMeanStd(1, -1)).toThrow(RangeError);
    expect(() => logNormalMoments(0, -1)).toThrow(RangeError);
    expect(() => logNormalSample(seeded(), 0, -1)).toThrow(RangeError);
  });

  it('is reproducible and approaches theoretical moments', () => {
    const expected = logNormalMoments(0, 0.5);
    const distribution = createLogNormal(expected.mean, Math.sqrt(expected.variance));
    expect(distribution.support).toEqual([0, Number.POSITIVE_INFINITY]);
    expect(distribution.mean).toBeCloseTo(expected.mean, 10);

    expect(sampleMany(distribution, seeded(777), 32)).toEqual(sampleMany(distribution, seeded(777), 32));

    const values = sampleMany(distribution, seeded(), 20000);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    expect(average).toBeCloseTo(expected.mean, 1);
    expect(Math.sqrt(variance)).toBeCloseTo(Math.sqrt(expected.variance), 1);
    expect(values.every((value) => value > 0)).toBe(true);
  });
});
