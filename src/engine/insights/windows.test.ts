import { describe, expect, it } from 'vitest';
import { rollingWindowStatistics } from './windows';

describe('rollingWindowStatistics', () => {
  it('emits trailing windows with mean, min, max and population std', () => {
    const windows = rollingWindowStatistics([1, 2, 3, 4], { windowSize: 2 });
    expect(windows).toHaveLength(4);
    expect(windows[0]).toEqual({ start: 0, end: 0, count: 1, mean: 1, min: 1, max: 1, std: 0 });
    expect(windows[1]).toEqual({ start: 0, end: 1, count: 2, mean: 1.5, min: 1, max: 2, std: 0.5 });
    const last = windows[3];
    expect(last?.start).toBe(2);
    expect(last?.end).toBe(3);
    expect(last?.mean).toBe(3.5);
    expect(last?.std).toBe(0.5);
  });

  it('respects minPeriods and skips incomplete leading windows', () => {
    const series = [1, 10, 10, 10];
    const complete = rollingWindowStatistics(series, { windowSize: 3, minPeriods: 3 });
    expect(complete.map((window) => window.start)).toEqual([0, 1]);
    expect(complete[1]?.mean).toBeCloseTo(10, 10);
    expect(rollingWindowStatistics(series, { windowSize: 3, minPeriods: 2 }).map((window) => window.count))
      .toEqual([2, 3, 3]);
  });

  it('skips non-finite samples inside windows and uses a default size of three', () => {
    const windows = rollingWindowStatistics([1, Number.NaN, 2, 3, 4]);
    expect(windows.map((window) => window.count)).toEqual([1, 1, 2, 2, 3]);
    expect(windows[4]?.mean).toBe(3);
    expect(windows[4]?.min).toBe(2);
    expect(windows[4]?.max).toBe(4);
    expect(rollingWindowStatistics([])).toEqual([]);
  });

  it('normalizes invalid or fractional window sizes', () => {
    expect(rollingWindowStatistics([1, 2], { windowSize: 0 }).map((window) => window.count)).toEqual([1, 1]);
    expect(rollingWindowStatistics([1, 2, 3], { windowSize: 2.8 }).map((window) => window.count))
      .toEqual([1, 2, 2]);
  });
});
