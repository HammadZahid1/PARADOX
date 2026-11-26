import { describe, expect, it } from 'vitest';
import type { MonteCarloRequest } from '@/engine/types';
import { computeDistributionStatistics, deriveSeed, isMonteWorkerMessage, runMonteCarlo } from './index';

const request: MonteCarloRequest = {
  scenarioId: 'scenario-1',
  runs: 1,
  baseSeed: 3,
  maxSteps: 2,
  variableKey: 'v',
};

describe('monte barrel', () => {
  it('re-exports statistics helpers', () => {
    expect(computeDistributionStatistics([2, 4]).mean).toBe(3);
  });

  it('re-exports runner helpers', () => {
    expect(deriveSeed(3, 0)).toBeGreaterThanOrEqual(0);
    const emptyRequest = { ...request, runs: 0 };
    expect(runMonteCarlo(emptyRequest, () => {
      throw new Error('not called in this assertion');
    }).runs).toHaveLength(0);
  });

  it('re-exports the worker protocol guard', () => {
    expect(isMonteWorkerMessage({ type: 'monte:run', requestId: 'r', request })).toBe(true);
    expect(isMonteWorkerMessage({ type: 'unknown' })).toBe(false);
  });
});
