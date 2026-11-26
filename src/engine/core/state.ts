import type { EntityId, ScalarValue, VariableDefinition, WorldState } from '@/engine/types';
import { deepClone } from '@/utils/clone';
import { hashString } from '@/utils/id';

export interface StateInitOptions {
  id?: EntityId;
  definitions: readonly VariableDefinition[];
  parameters?: Record<string, ScalarValue>;
  seed: number;
  stepDuration?: number;
  parentId?: EntityId;
}

/** Build a fully independent initial world state from variable definitions. */
export function createInitialState(options: StateInitOptions): WorldState {
  const variables: Record<string, ScalarValue> = {};
  for (const definition of options.definitions) variables[definition.id] = definition.initial;
  return {
    id: options.id ?? `state_${hashString(`${options.seed}:${Object.keys(variables).join(',')}`)}`,
    time: 0,
    step: 0,
    variables,
    parameters: { ...(options.parameters ?? {}) },
    activeEvents: [],
    eventHistory: [],
    metrics: { totalEvents: 0, totalChanges: 0, activeEvents: 0 },
    seed: options.seed,
    version: 1,
    parentId: options.parentId,
    changes: [],
  };
}

export function cloneState(state: WorldState): WorldState {
  return deepClone(state);
}

/** Restore a state into a fresh identity so historical states remain immutable. */
export function restoreState(source: WorldState, asBranch = false): WorldState {
  const restored = cloneState(source);
  restored.id = asBranch ? `state_${hashString(`${source.id}:branch:${Date.now()}`)}` : `${source.id}_restored`;
  restored.parentId = source.id;
  restored.version += 1;
  return restored;
}

export function advanceClock(state: WorldState, stepDuration = 1): WorldState {
  return {
    ...state,
    id: `state_${hashString(`${state.id}:${state.step + 1}:${state.seed}`)}`,
    parentId: state.id,
    step: state.step + 1,
    time: state.time + stepDuration,
    version: state.version + 1,
    variables: { ...state.variables },
    parameters: { ...state.parameters },
    activeEvents: state.activeEvents.map((event) => ({ ...event })),
    eventHistory: [...state.eventHistory],
    metrics: { ...state.metrics },
    changes: [],
  };
}

/** Canonical representation used to prove deterministic equivalence between runs. */
export function stateFingerprint(state: WorldState): string {
  const sortedVariables = Object.entries(state.variables).sort(([a], [b]) => a.localeCompare(b));
  const sortedMetrics = Object.entries(state.metrics).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({
    step: state.step,
    time: state.time,
    seed: state.seed,
    variables: sortedVariables,
    metrics: sortedMetrics,
    activeEvents: state.activeEvents.map((event) => event.eventId).sort(),
    events: state.eventHistory.map((event) => `${event.eventId}@${event.step}`),
  });
}

export function statesEqual(left: WorldState, right: WorldState): boolean {
  return stateFingerprint(left) === stateFingerprint(right);
}
