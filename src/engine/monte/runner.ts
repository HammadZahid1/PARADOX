import type {
  MonteCarloRequest,
  MonteCarloResult,
  MonteCarloRun,
  Timeline,
  WorldState,
} from '@/engine/types';
import { toNumericValue } from '@/engine/analytics/trajectories';
import { hashString } from '@/utils/id';
import { computeDistributionStatistics } from './statistics';

export interface MonteProgress {
  completed: number;
  total: number;
  runIndex: number;
  seed: number;
  value: number | null;
  cancelled: boolean;
}

export interface MonteRunOptions {
  onProgress?: (progress: MonteProgress) => void;
  shouldCancel?: () => boolean;
}

export type MonteSimulate = (
  seed: number,
  runIndex: number,
) => { finalState: WorldState; timeline: Timeline };

/** Deterministic, order-independent seed for a trial inside one seed family. */
export function deriveSeed(baseSeed: number, runIndex: number): number {
  const base = Number.isFinite(baseSeed) ? Math.trunc(baseSeed) : 0;
  const index = Number.isFinite(runIndex) ? Math.trunc(runIndex) : 0;
  return hashString(`${base}:${index}`);
}

function extractValue(state: WorldState, variableKey: string): number {
  return toNumericValue(state.variables[variableKey]) ?? Number.NaN;
}

/**
 * Run a Monte Carlo batch sequentially. Completed runs are always preserved,
 * including when cancellation stops the batch early.
 */
export function runMonteCarlo(
  request: MonteCarloRequest,
  simulate: MonteSimulate,
  options: MonteRunOptions = {},
): MonteCarloResult {
  const startedAt = performance.now();
  const total = Math.max(0, Number.isFinite(request.runs) ? Math.floor(request.runs) : 0);
  const runs: MonteCarloRun[] = [];
  const values: number[] = [];
  let cancelled = false;

  for (let runIndex = 0; runIndex < total; runIndex += 1) {
    if (options.shouldCancel?.()) {
      cancelled = true;
      break;
    }
    const seed = deriveSeed(request.baseSeed, runIndex);
    const outcome = simulate(seed, runIndex);
    const value = extractValue(outcome.finalState, request.variableKey);
    runs.push({ seed, finalState: outcome.finalState, timeline: outcome.timeline });
    values.push(value);
    options.onProgress?.({
      completed: runs.length,
      total,
      runIndex,
      seed,
      value: Number.isFinite(value) ? value : null,
      cancelled: false,
    });
  }

  if (cancelled) {
    options.onProgress?.({
      completed: runs.length,
      total,
      runIndex: runs.length,
      seed: deriveSeed(request.baseSeed, runs.length),
      value: null,
      cancelled: true,
    });
  }

  return {
    request: { ...request },
    statistics: computeDistributionStatistics(values),
    values,
    runs,
    elapsedMs: Math.max(0, performance.now() - startedAt),
    cancelled,
  };
}
