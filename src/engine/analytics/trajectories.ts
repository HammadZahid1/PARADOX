import type {
  EntityId,
  ScalarValue,
  TimelineEntry,
  TimelineSnapshot,
  VariableDefinition,
  VariableTrajectory,
  WorldState,
} from '@/engine/types';
import { mean, safeDivide, standardDeviation } from '@/utils/math';

/** A timeline entry may carry its reconstructed state directly. */
export type TrajectoryEntry = (TimelineEntry & { state?: WorldState }) | TimelineSnapshot;

/** Optional way to resolve a state for entries that only hold a `stateId`. */
export type StateResolver = ReadonlyMap<EntityId, WorldState> | ((entry: TrajectoryEntry) => WorldState | undefined);

export interface TrajectoryStatistics {
  /** Number of numeric samples used for the statistics. */
  count: number;
  first: number | null;
  last: number | null;
  min: number | null;
  max: number | null;
  /** Least-squares change in value per simulation step. */
  slope: number;
  /** Sample standard deviation of the per-step change rate. */
  volatility: number;
}

function numericValue(value: ScalarValue | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveState(entry: TrajectoryEntry, states: StateResolver | undefined): WorldState | undefined {
  if ('state' in entry && entry.state) return entry.state;
  if (states instanceof Map) return 'stateId' in entry ? states.get(entry.stateId) : undefined;
  if (typeof states === 'function') return states(entry);
  return undefined;
}

/**
 * Build one trajectory per variable definition. Entries are ordered by step/time
 * without mutating the input; entries whose state cannot be resolved are skipped.
 */
export function buildTrajectories(
  entries: readonly TrajectoryEntry[],
  definitions: readonly VariableDefinition[],
  states?: StateResolver,
): VariableTrajectory[] {
  const ordered = [...entries].sort((a, b) => a.step - b.step || a.time - b.time);
  const resolved = ordered.map((entry) => resolveState(entry, states));

  return definitions.map((definition) => {
    const points: VariableTrajectory['points'] = [];
    ordered.forEach((entry, index) => {
      const state = resolved[index];
      if (!state) return;
      const value = state.variables[definition.id];
      if (value === undefined) return;
      points.push({ step: entry.step, time: entry.time, value });
    });
    return { variableId: definition.id, key: definition.key, points };
  });
}

/** Descriptive statistics over the numeric samples of a trajectory. */
export function trajectoryStatistics(trajectory: VariableTrajectory): TrajectoryStatistics {
  const samples: Array<{ step: number; value: number }> = [];
  for (const point of trajectory.points) {
    const value = numericValue(point.value);
    if (value !== null) samples.push({ step: point.step, value });
  }

  if (samples.length === 0) {
    return { count: 0, first: null, last: null, min: null, max: null, slope: 0, volatility: 0 };
  }

  let min = samples[0]?.value ?? 0;
  let max = min;
  for (const sample of samples) {
    if (sample.value < min) min = sample.value;
    if (sample.value > max) max = sample.value;
  }

  const averageStep = mean(samples.map((sample) => sample.step));
  const averageValue = mean(samples.map((sample) => sample.value));
  const covariance = samples.reduce(
    (sum, sample) => sum + (sample.step - averageStep) * (sample.value - averageValue),
    0,
  );
  const stepVariance = samples.reduce((sum, sample) => sum + (sample.step - averageStep) ** 2, 0);
  const slope = safeDivide(covariance, stepVariance);

  const rates: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (!previous || !current) continue;
    rates.push(safeDivide(current.value - previous.value, current.step - previous.step));
  }

  return {
    count: samples.length,
    first: samples[0]?.value ?? null,
    last: samples[samples.length - 1]?.value ?? null,
    min,
    max,
    slope,
    volatility: standardDeviation(rates, true),
  };
}

/** Change rate at an exact step, or 0 when the step/sample is unavailable. */
export function rateOfChange(trajectory: VariableTrajectory, step: number): number {
  let targetIndex = -1;
  for (let index = trajectory.points.length - 1; index >= 0; index -= 1) {
    const point = trajectory.points[index];
    if (point?.step === step) {
      targetIndex = index;
      break;
    }
  }
  if (targetIndex <= 0) return 0;

  const currentPoint = trajectory.points[targetIndex];
  const current = numericValue(currentPoint?.value);
  if (current === null) return 0;

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const point = trajectory.points[index];
    if (!point || point.step >= step) continue;
    const previous = numericValue(point.value);
    if (previous === null) continue;
    return safeDivide(current - previous, step - point.step);
  }
  return 0;
}

export { numericValue as toNumericValue };
