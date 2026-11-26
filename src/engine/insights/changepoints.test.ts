import { describe, expect, it } from 'vitest';
import { detectChangepoints } from './changepoints';

describe('detectChangepoints', () => {
  it('finds the largest mean shift with its signed direction', () => {
    const points = detectChangepoints([1, 1, 1, 10, 10, 10], { threshold: 5, topN: 1 });
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({
      index: 3, beforeMean: 1, afterMean: 10, shift: 9, magnitude: 9,
    });
  });

  it('ranks shifts by magnitude then index and applies topN', () => {
    const points = detectChangepoints([0, 0, 10, 10, 0, 0], { topN: 2 });
    expect(points.map((point) => point.index)).toEqual([2, 4]);
    expect(points[0]?.shift).toBeGreaterThan(0);
    expect(points[1]?.shift).toBeLessThan(0);
  });

  it('applies a threshold and returns nothing for flat, short or empty series', () => {
    expect(detectChangepoints([1, 1, 1, 1], { threshold: 0.001 })).toEqual([]);
    expect(detectChangepoints([1])).toEqual([]);
    expect(detectChangepoints([])).toEqual([]);
    expect(detectChangepoints([0, 0, 10, 10], { topN: 0 })).toEqual([]);
  });

  it('ignores non-finite samples when computing segment means', () => {
    const points = detectChangepoints([1, 1, Number.NaN, 10, 10], { topN: 1 });
    expect(points[0]?.index).toBe(2);
    expect(points[0]?.magnitude).toBe(9);
  });
});
