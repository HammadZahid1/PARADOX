import type {
  EntityId,
  ScalarValue,
  ScenarioObjective,
  VariableDefinition,
  WorldState,
} from '@/engine/types';
import { clamp, safeDivide } from '@/utils/math';

const COMPARISON_EPSILON = 1e-9;

export interface ScenarioScoringOptions {
  scenarioId?: EntityId;
  /** Maps objective variable keys to the ids used in `WorldState.variables`. */
  definitions?: readonly VariableDefinition[];
}

export interface ObjectiveEvaluation {
  objectiveId: EntityId;
  name: string;
  variableKey: string;
  operator: ScenarioObjective['operator'];
  target: number;
  /** Numeric state value, or null when missing or non-numeric. */
  actual: number | null;
  satisfied: boolean;
  /** Descriptive heuristic progress in [0, 1]; not a probability or causal score. */
  progress: number;
}

export interface ScenarioScore {
  scenarioId: EntityId;
  step: number;
  evaluated: number;
  satisfied: number;
  /** Fraction of evaluated objectives met; 0 when there are no objectives. */
  score: number;
  objectives: ObjectiveEvaluation[];
}

function toNumber(value: ScalarValue | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveVariableId(key: string, definitions: readonly VariableDefinition[] | undefined): string {
  return definitions?.find((definition) => definition.key === key)?.id ?? key;
}

/** Evaluate one objective against the current world state. */
export function evaluateObjective(
  objective: ScenarioObjective,
  state: WorldState,
  definitions?: readonly VariableDefinition[],
): ObjectiveEvaluation {
  const actual = toNumber(state.variables[resolveVariableId(objective.variableKey, definitions)]);
  const target = Number.isFinite(objective.target) ? objective.target : 0;
  let satisfied = false;
  let progress = 0;

  if (actual !== null) {
    if (objective.operator === 'gte') {
      satisfied = actual >= target;
      progress = target === 0 ? (satisfied ? 1 : 0) : clamp(actual / target, 0, 1);
    } else if (objective.operator === 'lte') {
      satisfied = actual <= target;
      progress = actual === 0 ? 1 : clamp(target / actual, 0, 1);
    } else {
      satisfied = Math.abs(actual - target) <= COMPARISON_EPSILON;
      progress = clamp(1 - Math.abs(actual - target) / Math.max(Math.abs(target), 1), 0, 1);
    }
  }

  return {
    objectiveId: objective.id,
    name: objective.name,
    variableKey: objective.variableKey,
    operator: objective.operator,
    target,
    actual,
    satisfied,
    progress,
  };
}

/** Evaluate several objectives against one state. */
export function evaluateObjectives(
  objectives: readonly ScenarioObjective[],
  state: WorldState,
  definitions?: readonly VariableDefinition[],
): ObjectiveEvaluation[] {
  return objectives.map((objective) => evaluateObjective(objective, state, definitions));
}

/**
 * Score scenario objectives from a world state. Scores summarize how well the
 * observed state matches authored targets; they do not explain why it changed.
 */
export function scoreScenario(
  objectives: readonly ScenarioObjective[],
  state: WorldState,
  options: ScenarioScoringOptions = {},
): ScenarioScore {
  const evaluations = evaluateObjectives(objectives, state, options.definitions);
  const satisfied = evaluations.filter((evaluation) => evaluation.satisfied).length;
  return {
    scenarioId: options.scenarioId ?? 'scenario',
    step: state.step,
    evaluated: evaluations.length,
    satisfied,
    score: safeDivide(satisfied, evaluations.length),
    objectives: evaluations,
  };
}
