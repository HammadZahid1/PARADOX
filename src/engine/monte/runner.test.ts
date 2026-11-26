import { describe, expect, it } from 'vitest';
import type { MonteCarloRequest, Timeline, VariableDefinition } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { deriveSeed, runMonteCarlo, type MonteProgress } from './runner';

const definitions: VariableDefinition[] = [
  { id: 'population', key: 'population', name: 'Population', type: 'number', initial: 0 },
];

const request: MonteCarloRequest = {
  scenarioId: 'scenario-1',
  runs: 3,
  baseSeed: 42,
  maxSteps: 5,
  variableKey: 'population',
  sampleEvery: 2,
};

function outcome(value: number): { finalState: ReturnType<typeof createInitialState>; timeline: Timeline } {
  const state = createInitialState({ definitions, seed: 1 });
  return {
    finalState: { ...state, variables: { population: value } },
    timeline: { id: 'timeline', branchId: 'branch', entries: [], snapshots: [], events: [] },
  };
}

describe('deriveSeed', () => {
  it('is deterministic and distinct per run index', () => {
    expect(deriveSeed(42, 0)).toBe(deriveSeed(42, 0));
    expect(deriveSeed(42, 0)).not.toBe(deriveSeed(42, 1));
    expect(deriveSeed(42, 0)).not.toBe(deriveSeed(43, 0));
  });
});

describe('runMonteCarlo', () => {
  it('runs every trial sequentially and extracts final variable values', () => {
    const seeds: number[] = [];
    const result = runMonteCarlo(request, (seed, runIndex) => {
      seeds.push(seed);
      return outcome(runIndex + 1);
    });

    expect(seeds).toEqual([deriveSeed(42, 0), deriveSeed(42, 1), deriveSeed(42, 2)]);
    expect(result.runs.map((run) => run.seed)).toEqual(seeds);
    expect(result.values).toEqual([1, 2, 3]);
    expect(result.statistics.mean).toBe(2);
    expect(result.cancelled).toBe(false);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.elapsedMs)).toBe(true);
  });

  it('reports progress after each completed run', () => {
    const progress: MonteProgress[] = [];
    runMonteCarlo(request, (_seed, runIndex) => outcome(runIndex * 10), {
      onProgress: (update) => progress.push(update),
    });

    expect(progress.map((update) => update.completed)).toEqual([1, 2, 3]);
    expect(progress.map((update) => update.runIndex)).toEqual([0, 1, 2]);
    expect(progress.map((update) => update.value)).toEqual([0, 10, 20]);
    expect(progress.every((update) => !update.cancelled)).toBe(true);
  });

  it('preserves completed runs and notifies once on cancellation', () => {
    let checks = 0;
    const progress: MonteProgress[] = [];
    const result = runMonteCarlo(request, (_seed, runIndex) => outcome(runIndex + 1), {
      shouldCancel: () => {
        checks += 1;
        return checks > 2;
      },
      onProgress: (update) => progress.push(update),
    });

    expect(result.cancelled).toBe(true);
    expect(result.runs).toHaveLength(2);
    expect(result.values).toEqual([1, 2]);
    expect(result.statistics.count).toBe(2);
    expect(progress).toHaveLength(3);
    expect(progress[2]?.cancelled).toBe(true);
    expect(progress[2]?.completed).toBe(2);
  });

  it('reproduces identical statistics and seeds for the same request', () => {
    const simulate = (seed: number, runIndex: number) => outcome((seed % 7) + runIndex);
    const first = runMonteCarlo(request, simulate);
    const second = runMonteCarlo(request, simulate);
    expect(first.values).toEqual(second.values);
    expect(first.statistics).toEqual(second.statistics);
    expect(first.runs.map((run) => run.seed)).toEqual(second.runs.map((run) => run.seed));
  });

  it('copies the request so later caller mutation cannot change the result', () => {
    const mutable = { ...request };
    const result = runMonteCarlo(mutable, (_seed, runIndex) => outcome(runIndex + 1));
    mutable.variableKey = 'other';
    mutable.runs = 99;
    expect(result.request.variableKey).toBe('population');
    expect(result.request.runs).toBe(3);
    expect(result.request.sampleEvery).toBe(2);
  });
});
