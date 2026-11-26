import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '@/engine/simulation/engine';
import type { Scenario } from '@/engine/types';
import { createStepBudget, runWithinBudget, scenarioFitsBudget } from './budget';

const scenario: Scenario = {
  id: 's1',
  name: 'Budget test',
  description: '',
  domain: 'test',
  worldId: 'w1',
  variables: [{ id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 100 }],
  parameters: {},
  rules: [],
  events: [],
  configuration: {
    stepDuration: 1,
    maxSteps: 10,
    seed: 7,
    mode: 'deterministic',
    propagationLimit: 4,
    autoSnapshotSteps: 0,
    strictValidation: true,
  },
  objectives: [],
  tags: [],
  preset: false,
  createdAt: 0,
  updatedAt: 0,
  version: 1,
};

describe('step budget', () => {
  it('reports remaining steps and stops consuming once exhausted', () => {
    const budget = createStepBudget(3);
    expect(budget.remaining).toBe(3);
    expect(budget.exhausted).toBe(false);
    expect(budget.shouldStop()).toBe(false);
    expect(budget.canConsume(2)).toBe(true);
    expect(budget.consume(2)).toBe(2);
    expect(budget.remaining).toBe(1);
    expect(budget.consume(5)).toBe(1);
    expect(budget.exhausted).toBe(true);
    expect(budget.shouldStop()).toBe(true);
    expect(budget.canConsume()).toBe(false);
    expect(budget.consume()).toBe(0);
    expect(budget.snapshot()).toEqual({ limit: 3, used: 3 });
    expect(budget.reset().remaining).toBe(3);
  });

  it('normalizes invalid limits and pre-consumed amounts', () => {
    expect(createStepBudget(Number.NaN).exhausted).toBe(true);
    expect(createStepBudget(-2).limit).toBe(0);
    expect(createStepBudget(4, 99).snapshot()).toEqual({ limit: 4, used: 4 });
    expect(createStepBudget(4.9).limit).toBe(4);
  });

  it('acts as a cooperative cancellation predicate for a real engine run', () => {
    const engine = new SimulationEngine(scenario);
    const budget = createStepBudget(2, 1);
    const results = runWithinBudget(engine, budget);
    expect(results).toHaveLength(1);
    expect(engine.activeBranch.currentState.step).toBe(1);
    expect(budget.exhausted).toBe(true);
  });

  it('checks whether a scenario fits the remaining budget', () => {
    expect(scenarioFitsBudget(scenario, createStepBudget(10))).toBe(true);
    expect(scenarioFitsBudget(scenario, createStepBudget(4))).toBe(false);
  });
});
