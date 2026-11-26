import type {
  EntityId,
  TimelineSnapshot,
  VariableDefinition,
  VariableDifference,
  WorldState,
} from '@/engine/types';
import { toNumericValue } from '@/engine/analytics/trajectories';
import { relativeDifference } from '@/utils/math';

export type ComparableSnapshot = TimelineSnapshot | WorldState;

export interface MetricDelta {
  key: string;
  left: number;
  right: number;
  /** Signed difference: right minus left. */
  delta: number;
  relative: number | null;
}

export interface SnapshotComparison {
  leftId: EntityId;
  rightId: EntityId;
  leftStep: number;
  rightStep: number;
  changedVariables: VariableDifference[];
  metricDeltas: MetricDelta[];
}

function stateOf(snapshot: ComparableSnapshot): WorldState {
  return 'state' in snapshot ? snapshot.state : snapshot;
}

function numericMetric(state: WorldState, key: string): number {
  const value = state.metrics[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Compare two snapshots (or raw world states) at the captured step. */
export function compareSnapshots(
  left: ComparableSnapshot,
  right: ComparableSnapshot,
  definitions: readonly VariableDefinition[],
): SnapshotComparison {
  const leftState = stateOf(left);
  const rightState = stateOf(right);

  const changedVariables: VariableDifference[] = [];
  for (const definition of definitions) {
    const leftValue = leftState.variables[definition.id] ?? definition.initial;
    const rightValue = rightState.variables[definition.id] ?? definition.initial;
    if (Object.is(leftValue, rightValue)) continue;

    const leftNumber = toNumericValue(leftValue);
    const rightNumber = toNumericValue(rightValue);
    changedVariables.push({
      key: definition.key,
      left: leftValue,
      right: rightValue,
      absolute: leftNumber !== null && rightNumber !== null ? rightNumber - leftNumber : null,
      relative: leftNumber !== null && rightNumber !== null
        ? relativeDifference(leftNumber, rightNumber)
        : null,
    });
  }

  const metricKeys = [...new Set([...Object.keys(leftState.metrics), ...Object.keys(rightState.metrics)])]
    .sort((a, b) => a.localeCompare(b));
  const metricDeltas: MetricDelta[] = metricKeys.map((key) => {
    const leftMetric = numericMetric(leftState, key);
    const rightMetric = numericMetric(rightState, key);
    return {
      key,
      left: leftMetric,
      right: rightMetric,
      delta: rightMetric - leftMetric,
      relative: relativeDifference(leftMetric, rightMetric),
    };
  });

  return {
    leftId: left.id,
    rightId: right.id,
    leftStep: leftState.step,
    rightStep: rightState.step,
    changedVariables,
    metricDeltas,
  };
}
