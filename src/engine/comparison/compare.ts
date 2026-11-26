import type {
  ComparisonResult,
  EventRecord,
  RealityBranch,
  ScalarValue,
  TimelineEntry,
  VariableDefinition,
  VariableDifference,
  VariableTrajectory,
  WorldState,
} from '@/engine/types';
import type { TrajectoryEntry } from '@/engine/analytics/trajectories';
import { buildTrajectories, toNumericValue } from '@/engine/analytics/trajectories';
import { stateFingerprint } from '@/engine/core/state';
import { relativeDifference } from '@/utils/math';
import { hashString } from '@/utils/id';

function collectStates(branch: RealityBranch): Map<number, WorldState> {
  const byStep = new Map<number, WorldState>();
  byStep.set(branch.initialState.step, branch.initialState);
  for (const entry of branch.timeline.entries) {
    const withState = entry as TimelineEntry & { state?: WorldState };
    if (withState.state) byStep.set(withState.state.step, withState.state);
  }
  for (const snapshot of branch.timeline.snapshots) byStep.set(snapshot.state.step, snapshot.state);
  byStep.set(branch.currentState.step, branch.currentState);
  return byStep;
}

function statesToEntries(states: ReadonlyMap<number, WorldState>): TrajectoryEntry[] {
  return [...states.entries()]
    .sort(([leftStep], [rightStep]) => leftStep - rightStep)
    .map(([step, state]) => ({
      step,
      time: state.time,
      stateId: state.id,
      changedVariables: [],
      eventIds: [],
      checkpoint: false,
      state,
    }));
}

function valuesByStep(trajectory: VariableTrajectory): Map<number, ScalarValue> {
  return new Map(trajectory.points.map((point) => [point.step, point.value]));
}

function firstValueDivergence(left: VariableTrajectory, right: VariableTrajectory): number | undefined {
  const rightValues = valuesByStep(right);
  for (const point of left.points) {
    if (!rightValues.has(point.step)) continue;
    if (point.value !== rightValues.get(point.step)) return point.step;
  }
  return undefined;
}

function findDivergenceStep(
  leftStates: ReadonlyMap<number, WorldState>,
  rightStates: ReadonlyMap<number, WorldState>,
  leftTrajectories: readonly VariableTrajectory[],
  rightTrajectories: readonly VariableTrajectory[],
): number | undefined {
  const commonSteps = [...leftStates.keys()]
    .filter((step) => rightStates.has(step))
    .sort((a, b) => a - b);

  for (const step of commonSteps) {
    const leftState = leftStates.get(step);
    const rightState = rightStates.get(step);
    if (!leftState || !rightState) continue;
    if (stateFingerprint(leftState) !== stateFingerprint(rightState)) return step;
  }

  const candidates = leftTrajectories.flatMap((trajectory, index) => {
    const counterpart = rightTrajectories[index];
    return counterpart ? [firstValueDivergence(trajectory, counterpart)] : [];
  });
  const steps = candidates.filter((step): step is number => step !== undefined);
  return steps.length > 0 ? Math.min(...steps) : undefined;
}

function eventLog(branch: RealityBranch): readonly EventRecord[] {
  return branch.timeline.events.length > 0 ? branch.timeline.events : branch.currentState.eventHistory;
}

function uniqueEventNames(branch: RealityBranch): string[] {
  const names = new Set(eventLog(branch).map((event) => event.eventName || event.eventId));
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Compare two branches using their recorded states, timelines and current values. */
export function compareBranches(
  left: RealityBranch,
  right: RealityBranch,
  definitions: readonly VariableDefinition[],
): ComparisonResult {
  const leftStates = collectStates(left);
  const rightStates = collectStates(right);
  const leftEntries = statesToEntries(leftStates);
  const rightEntries = statesToEntries(rightStates);
  const leftTrajectories = buildTrajectories(leftEntries, definitions);
  const rightTrajectories = buildTrajectories(rightEntries, definitions);
  const divergenceStep = findDivergenceStep(leftStates, rightStates, leftTrajectories, rightTrajectories);

  const differences: VariableDifference[] = definitions.map((definition, trajectoryIndex) => {
    const leftRaw = left.currentState.variables[definition.id] ?? definition.initial;
    const rightRaw = right.currentState.variables[definition.id] ?? definition.initial;
    const leftNumber = toNumericValue(leftRaw);
    const rightNumber = toNumericValue(rightRaw);
    const absolute = leftNumber !== null && rightNumber !== null ? rightNumber - leftNumber : null;
    const relative = leftNumber !== null && rightNumber !== null
      ? relativeDifference(leftNumber, rightNumber)
      : null;
    const divergedAtStep = firstValueDivergence(
      leftTrajectories[trajectoryIndex] ?? { variableId: definition.id, key: definition.key, points: [] },
      rightTrajectories[trajectoryIndex] ?? { variableId: definition.id, key: definition.key, points: [] },
    );
    return {
      key: definition.key,
      left: leftRaw,
      right: rightRaw,
      absolute,
      relative,
      ...(divergedAtStep !== undefined ? { divergedAtStep } : {}),
    };
  });

  const trajectories: VariableTrajectory[] = [
    ...leftTrajectories.map((trajectory) => ({ ...trajectory, points: [...trajectory.points] })),
    ...rightTrajectories.map((trajectory) => ({
      ...trajectory,
      key: `${trajectory.key} (${right.name || right.id})`,
      points: [...trajectory.points],
    })),
  ];

  const leftNames = new Set(uniqueEventNames(left));
  const rightNames = new Set(uniqueEventNames(right));
  const commonEvents = [...leftNames].filter((name) => rightNames.has(name)).sort((a, b) => a.localeCompare(b));
  const uniqueLeftEvents = [...leftNames].filter((name) => !rightNames.has(name)).sort((a, b) => a.localeCompare(b));
  const uniqueRightEvents = [...rightNames].filter((name) => !leftNames.has(name)).sort((a, b) => a.localeCompare(b));

  return {
    id: `comparison_${hashString(`${left.id}|${right.id}`)}`,
    leftBranchId: left.id,
    rightBranchId: right.id,
    leftName: left.name,
    rightName: right.name,
    differences,
    trajectories,
    ...(divergenceStep !== undefined ? { divergenceStep } : {}),
    leftEventCount: eventLog(left).length,
    rightEventCount: eventLog(right).length,
    commonEvents,
    uniqueLeftEvents,
    uniqueRightEvents,
    createdAt: Date.now(),
  };
}
