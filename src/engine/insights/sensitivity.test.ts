import { describe, expect, it } from 'vitest';
import type { ScalarValue, VariableTrajectory } from '@/engine/types';
import { estimateSensitivity } from './sensitivity';

function trajectory(key: string, entries: ReadonlyArray<readonly [number, ScalarValue]>): VariableTrajectory {
  return {
    variableId: key,
    key,
    points: entries.map(([step, value]) => ({ step, time: step, value })),
  };
}

describe('estimateSensitivity', () => {
  it('finds the strongest association when the source leads the target', () => {
    const source = trajectory('source', [
      [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
    ]);
    const target = trajectory('target', [
      [0, 0], [1, 0], [2, 0], [3, 1], [4, 2], [5, 3],
    ]);
    const estimate = estimateSensitivity(source, target);
    expect(estimate.sourceKey).toBe('source');
    expect(estimate.targetKey).toBe('target');
    expect(estimate.pairCount).toBe(6);
    expect(estimate.bestLag).toBe(2);
    expect(estimate.laggedCorrelation).toBeCloseTo(1, 10);
    expect(estimate.correlation).toBeLessThan(1);
    expect(estimate.interpretation).toBe('descriptive-only');
  });

  it('keeps an inverse same-step association at lag zero', () => {
    const source = trajectory('source', [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
    const target = trajectory('target', [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]]);
    const estimate = estimateSensitivity(source, target, { maxLag: 2 });
    expect(estimate.correlation).toBeCloseTo(-1, 10);
    expect(estimate.laggedCorrelation).toBeCloseTo(-1, 10);
    expect(estimate.bestLag).toBe(0);
  });

  it('aligns by step, converts scalar values and handles constant or missing samples', () => {
    const source = trajectory('source', [[0, '2'], [1, '4'], [2, 6], [3, 8]]);
    const target = trajectory('target', [[0, true], [1, false], [3, '0']]);
    const estimate = estimateSensitivity(source, target, { maxLag: 0 });
    expect(estimate.pairCount).toBe(3);
    expect(estimate.bestLag).toBe(0);
    expect(estimate.laggedCorrelation).toBe(estimate.correlation);

    const constant = estimateSensitivity(
      trajectory('flat', [[0, 5], [1, 5], [2, 5]]),
      trajectory('target', [[0, 1], [1, 2], [2, 3]]),
    );
    expect(constant.correlation).toBe(0);
    expect(constant.laggedCorrelation).toBe(0);
  });
});
