import { describe, expect, it } from 'vitest';
import type { VariableDefinition } from '@/engine/types';
import {
  cloneScenario,
  createScenario,
  defaultConfiguration,
  makeEvent,
  makeRule,
  makeVariable,
} from './factory';

describe('scenario factory helpers', () => {
  it('creates typed variables with deterministic defaults and copied options', () => {
    const tags = ['macro'];
    const variable = makeVariable({
      id: 'economy.inflation',
      key: 'inflation',
      name: 'Inflation',
      type: 'number',
      initial: 2,
      min: 0,
      max: 30,
      tags,
    });
    tags.push('mutated');

    expect(variable).toMatchObject({
      id: 'economy.inflation',
      type: 'number',
      initial: 2,
      min: 0,
      max: 30,
      description: 'Simulation variable Inflation',
    });
    expect(variable.tags).toEqual(['macro']);

    const derived: VariableDefinition = makeVariable({
      id: 'economy.growth',
      key: 'growth',
      name: 'Growth',
      type: 'derived',
      initial: 0,
      derivedFrom: ['production', 'supply'],
      expression: 'production - supply',
    });
    expect(derived.derivedFrom).toEqual(['production', 'supply']);
    expect(derived.expression).toBe('production - supply');
  });

  it('creates enabled rules and infers event metadata from triggers', () => {
    const rule = makeRule({
      id: 'r1',
      name: 'Demand squeeze',
      effects: [{ kind: 'increase', variableKey: 'inflation', amount: 1 }],
      priority: 7,
      conditions: [{ id: 'c1', variableKey: 'demand', operator: 'gt', value: 100 }],
    });
    expect(rule).toMatchObject({ id: 'r1', enabled: true, priority: 7, category: 'general' });
    expect(rule.conditions).toHaveLength(1);

    const conditional = makeEvent({
      id: 'e1',
      name: 'Policy response',
      trigger: { kind: 'threshold', variableKey: 'inflation', operator: 'gte', value: 8 },
      effects: [{ kind: 'assign', variableKey: 'interestRate', value: 6 }],
      probability: 0.8,
      cooldownSteps: 10,
    });
    expect(conditional.type).toBe('conditional');
    expect(conditional.probability).toBe(0.8);
    expect(conditional.cooldownSteps).toBe(10);
    expect(conditional.dependencies).toEqual([]);

    const scheduled = makeEvent({
      id: 'e2',
      name: 'Shock',
      trigger: { kind: 'scheduled', atStep: 12 },
      effects: [{ kind: 'multiply', variableKey: 'investment', factor: 0.9 }],
      probability: 4,
    });
    expect(scheduled.type).toBe('scheduled');
    expect(scheduled.probability).toBe(1);
  });

  it('provides deterministic configuration defaults', () => {
    expect(defaultConfiguration()).toEqual({
      stepDuration: 1,
      maxSteps: 120,
      seed: 1337,
      mode: 'deterministic',
      propagationLimit: 6,
      autoSnapshotSteps: 10,
      strictValidation: true,
    });
    expect(defaultConfiguration({ maxSteps: 60 }).maxSteps).toBe(60);
    expect(defaultConfiguration().maxSteps).toBe(120);
  });

  it('creates stable scenarios and deep-clones nested data', () => {
    const scenario = createScenario({
      id: 'factory-test',
      name: 'Factory test',
      domain: 'test',
      description: 'A deterministic test scenario',
      variables: [makeVariable({ id: 'v1', key: 'x', name: 'X', type: 'number', initial: 1, tags: ['base'] })],
      rules: [makeRule({
        id: 'r1',
        name: 'Raise X',
        effects: [{ kind: 'increase', variableKey: 'x', amount: 1 }],
      })],
      events: [makeEvent({
        id: 'e1',
        name: 'Conditional event',
        trigger: { kind: 'threshold', variableKey: 'x', operator: 'gte', value: 2 },
        effects: [{
          kind: 'conditional',
          condition: { id: 'c1', variableKey: 'x', operator: 'lt', value: 5 },
          then: { kind: 'increase', variableKey: 'x', amount: 2 },
        }],
      })],
    });

    expect(scenario).toMatchObject({
      id: 'factory-test',
      worldId: 'world:factory-test',
      createdAt: 0,
      updatedAt: 0,
      version: 1,
      preset: false,
    });

    const copy = cloneScenario(scenario);
    expect(copy).toEqual(scenario);
    copy.variables[0]!.tags = ['changed'];
    copy.events[0]!.effects[0] = { kind: 'decrease', variableKey: 'x', amount: 3 };

    expect(scenario.variables[0]!.tags).toEqual(['base']);
    expect(scenario.events[0]!.effects[0]!.kind).toBe('conditional');
    expect(copy.configuration).not.toBe(scenario.configuration);
  });
});
