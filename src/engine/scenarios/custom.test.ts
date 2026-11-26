import { describe, expect, it } from 'vitest';
import { validateScenario } from '@/engine/validation';
import { customScenario, generateScenario } from './custom';
import { defaultConfiguration, makeVariable } from './factory';

describe('custom scenario builders', () => {
  it('builds a valid blank custom scenario and respects overrides', () => {
    const blank = customScenario();
    expect(blank.variables).toEqual([]);
    expect(blank.rules).toEqual([]);
    expect(blank.events).toEqual([]);
    expect(blank.preset).toBe(false);
    expect(blank.createdAt).toBe(0);
    expect(validateScenario(blank).valid).toBe(true);

    const overridden = customScenario({
      name: 'Mine',
      domain: 'sandbox',
      variables: [makeVariable({
        id: 'custom.heat',
        key: 'heat',
        name: 'Heat',
        type: 'number',
        initial: 10,
        min: 0,
        max: 100,
      })],
      configuration: defaultConfiguration({ maxSteps: 60 }),
      createdAt: 42,
    });
    expect(overridden.name).toBe('Mine');
    expect(overridden.domain).toBe('sandbox');
    expect(overridden.configuration.maxSteps).toBe(60);
    expect(overridden.configuration.stepDuration).toBe(1);
    expect(overridden.createdAt).toBe(42);
    expect(validateScenario(overridden).valid).toBe(true);
    expect(blank.name).toBe('Custom Scenario');
  });

  it('generates deterministic variables, rules and events from local templates', () => {
    const input = {
      title: 'Test Realm',
      domain: 'synthetic',
      startingConditions: { 'GDP growth': 2.5, '2026 outlook': -1, 'GDP-growth': 3 },
      eventNames: ['First shock', 'Second shock'],
      duration: 12,
    };
    const generated = generateScenario(input);

    expect(generated).toEqual(generateScenario(input));
    expect(generated.id).toBe('generated.test-realm.synthetic');
    expect(generated.name).toBe('Test Realm');
    expect(generated.configuration.maxSteps).toBe(30);
    expect(generated.configuration.seed).toBeGreaterThan(0);
    expect(generated.configuration.autoSnapshotSteps).toBeGreaterThanOrEqual(5);
    expect(generated.variables.map((variable) => variable.key)).toEqual([
      'gdp_growth', 'variable_2026_outlook', 'gdp_growth_2',
    ]);
    expect(generated.variables.map((variable) => variable.initial)).toEqual([2.5, -1, 3]);
    expect(generated.rules).toHaveLength(6);
    expect(generated.rules[0]).toMatchObject({
      priority: 10,
      condition: { variableKey: 'gdp_growth', operator: 'gte', value: 2.5 },
      effects: [{ kind: 'increase', variableKey: 'gdp_growth', amount: 0.5 }],
    });
    expect(generated.events.map((event) => event.trigger)).toEqual([
      { kind: 'scheduled', atStep: 5 },
      { kind: 'scheduled', atStep: 12 },
    ]);
    expect(generated.events[0]?.effects).toContainEqual({ kind: 'increase', variableKey: 'gdp_growth', amount: 1 });
    expect(generated.events[0]?.effects).toContainEqual({ kind: 'decrease', variableKey: 'variable_2026_outlook', amount: 0.5 });
    expect(generated.disclaimer).toContain('without network or AI');
    expect(validateScenario(generated).valid).toBe(true);
  });

  it('clamps duration and handles empty input deterministically', () => {
    const short = generateScenario({ title: 'Short', domain: 'test', startingConditions: {}, eventNames: [], duration: 5 });
    const long = generateScenario({ title: 'Long', domain: 'test', startingConditions: {}, eventNames: [], duration: 999 });

    expect(short.configuration.maxSteps).toBe(30);
    expect(long.configuration.maxSteps).toBe(200);
    expect(short.events).toEqual([]);
    expect(short.rules).toEqual([]);
    expect(validateScenario(short).valid).toBe(true);
    expect(validateScenario(long).valid).toBe(true);
  });
});
