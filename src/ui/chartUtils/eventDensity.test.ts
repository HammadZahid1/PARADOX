import { describe, expect, it } from 'vitest';
import { computeEventDensity } from '@/ui/chartUtils/eventDensity';

describe('computeEventDensity', () => {
  it('buckets events into tick bins and normalizes by width', () => {
    const bins = computeEventDensity([0.1, 0.2, 0.6, 0.9], [0, 0.5, 1]);
    expect(bins).toEqual([
      { start: 0, end: 0.5, count: 2, density: 1 },
      { start: 0.5, end: 1, count: 2, density: 1 },
    ]);
  });

  it('supports count normalization and non-uniform tick bins', () => {
    const events = [0.5, 1.5, 2.5];
    const ticks = [0, 1, 3];
    expect(computeEventDensity(events, ticks).map((bin) => bin.density)).toEqual([1, 1]);
    expect(computeEventDensity(events, ticks, { normalizeBy: 'count' }).map((bin) => bin.density))
      .toEqual([0.5, 1]);
  });

  it('handles inclusive and exclusive upper edges', () => {
    expect(computeEventDensity([1], [0, 1]).map((bin) => bin.count)).toEqual([1]);
    expect(computeEventDensity([1], [0, 1], { includeUpperEdge: false }).map((bin) => bin.count))
      .toEqual([0]);
  });

  it('sorts ticks, deduplicates them, and skips invalid events', () => {
    const bins = computeEventDensity(
      [Number.NaN, Number.POSITIVE_INFINITY, 0.25, 1],
      [1, 0, 0.5, 0],
    );
    expect(bins.map((bin) => [bin.start, bin.end, bin.count])).toEqual([
      [0, 0.5, 1],
      [0.5, 1, 1],
    ]);
  });

  it('handles empty inputs and single ticks', () => {
    expect(computeEventDensity([], [])).toEqual([]);
    expect(computeEventDensity([1], [1])).toEqual([]);
    expect(computeEventDensity([], [0, 1])).toEqual([
      { start: 0, end: 1, count: 0, density: 0 },
    ]);
  });

  it('is stable across repeated calls', () => {
    const events = [0.2, 0.4, 0.8];
    const ticks = [0, 0.5, 1];
    expect(computeEventDensity(events, ticks)).toEqual(computeEventDensity(events, ticks));
  });
});
