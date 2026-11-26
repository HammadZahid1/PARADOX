import { describe, expect, it } from 'vitest';
import { buildPercentileBands } from '@/ui/chartUtils/percentileBands';

describe('buildPercentileBands', () => {
  it('builds deterministic polygons from sorted samples', () => {
    const samples = [
      [0, 10, 20, 30, 100],
      [1, 11, 21, 31, 101],
    ];
    const bands = buildPercentileBands(samples, [[0.25, 0.75]]);

    expect(bands).toEqual([{
      low: 0.25,
      high: 0.75,
      points: [
        { x: 0, y: 30 },
        { x: 1, y: 31 },
        { x: 1, y: 11 },
        { x: 0, y: 10 },
      ],
    }]);
  });

  it('orders default bands from low to high and polygon points from upper to lower', () => {
    const bands = buildPercentileBands([[1, 2, 3, 4, 5]]);
    expect(bands.map((band) => [band.low, band.high])).toEqual([
      [0.05, 0.95],
      [0.25, 0.75],
    ]);

    const band = bands[0];
    expect(band?.points[0]).toEqual({ x: 0, y: 4.8 });
    expect(band?.points.at(-1)).toEqual({ x: 0, y: 1.2 });
  });

  it('skips columns without finite values and normalizes reversed bands', () => {
    const bands = buildPercentileBands([[1, Number.NaN], [Number.NaN, 2]], [[0.9, 0.1]]);
    expect(bands).toEqual([{
      low: 0.1,
      high: 0.9,
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 1 },
      ],
    }]);
  });

  it('returns an empty result for empty samples or invalid bands', () => {
    expect(buildPercentileBands([])).toEqual([]);
    expect(buildPercentileBands([[Number.NaN, Number.POSITIVE_INFINITY]])).toEqual([]);
    expect(buildPercentileBands([[1, 2]], [[Number.NaN, 0.5]])).toEqual([]);
  });

  it('is stable across repeated calls', () => {
    const samples = [[3, 1, 2], [6, 4, 5]];
    expect(buildPercentileBands(samples)).toEqual(buildPercentileBands(samples));
  });
});
