import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import type { ScenarioObjective, VariableDefinition, WorldState } from '@/engine/types';
import { evaluateObjective, scoreScenario } from './scenarios';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 10 },
  { id: 'v2', key: 'stability', name: 'Stability', type: 'number', initial: 5 },
];

function state(values: Record<string, number | boolean | string>, step = 7): WorldState {
  return { ...createInitialState({ definitions, seed: 1 }), step, variables: values };
}

function objective(
  id: string,
  variableKey: string,
  operator: ScenarioObjective['operator'],
  target: number,
): ScenarioObjective {
  return { id, name: `${id} objective`, variableKey, target, operator };
}

describe('evaluateObjective', () => {
  it('evaluates gte, lte and eq objectives through variable definitions', () => {
    const current = state({ v1: 12, v2: 0 });
    expect(evaluateObjective(objective('o1', 'population', 'gte', 10), current, definitions)).toEqual({
      objectiveId: 'o1',
      name: 'o1 objective',
      variableKey: 'population',
      operator: 'gte',
      target: 10,
      actual: 12,
      satisfied: true,
      progress: 1,
    });
    expect(evaluateObjective(objective('o2', 'stability', 'lte', 5), current, definitions).satisfied).toBe(true);
    expect(evaluateObjective(objective('o3', 'population', 'eq', 12), current, definitions).satisfied).toBe(true);
  });

  it('reports descriptive progress for unmet targets', () => {
    const current = state({ v1: 12, v2: 0 });
    const above = evaluateObjective(objective('o1', 'population', 'gte', 20), current, definitions);
    expect(above.satisfied).toBe(false);
    expect(above.progress).toBeCloseTo(0.6, 10);
    const exact = evaluateObjective(objective('o2', 'population', 'eq', 20), current, definitions);
    expect(exact.satisfied).toBe(false);
    expect(exact.progress).toBeCloseTo(0.6, 10);
    const atZero = evaluateObjective(objective('o3', 'stability', 'lte', 0), current, definitions);
    expect(atZero.satisfied).toBe(true);
    expect(atZero.progress).toBe(1);
  });

  it('handles missing variables, raw keys and scalar coercion', () => {
    const current = state({ v1: 12, active: true, label: '3' });
    const missing = evaluateObjective(objective('o1', 'population', 'gte', 1), current);
    expect(missing.actual).toBeNull();
    expect(missing.satisfied).toBe(false);
    expect(missing.progress).toBe(0);
    expect(evaluateObjective(objective('o2', 'v1', 'gte', 10), current).actual).toBe(12);
    expect(evaluateObjective(objective('o3', 'active', 'eq', 1), current).actual).toBe(1);
    expect(evaluateObjective(objective('o4', 'label', 'gte', 2), current).satisfied).toBe(true);
  });
});

describe('scoreScenario', () => {
  it('scores all objectives from the current state', () => {
    const current = state({ v1: 12, v2: 0 });
    const result = scoreScenario([
      objective('o1', 'population', 'gte', 10),
      objective('o2', 'stability', 'lte', 5),
      objective('o3', 'population', 'eq', 12),
    ], current, { scenarioId: 'urban', definitions });
    expect(result.scenarioId).toBe('urban');
    expect(result.step).toBe(7);
    expect(result.evaluated).toBe(3);
    expect(result.satisfied).toBe(3);
    expect(result.score).toBe(1);
    expect(result.objectives.map((item) => item.objectiveId)).toEqual(['o1', 'o2', 'o3']);
  });

  it('returns a zero score for no objectives or unmet objectives', () => {
    expect(scoreScenario([], state({ v1: 12, v2: 0 }))).toEqual({
      scenarioId: 'scenario', step: 7, evaluated: 0, satisfied: 0, score: 0, objectives: [],
    });
    const failed = scoreScenario([objective('o1', 'population', 'gte', 20)], state({ v1: 12 }));
    expect(failed.satisfied).toBe(0);
    expect(failed.score).toBe(0);
  });
});
