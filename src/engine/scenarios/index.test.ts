import { describe, expect, it } from 'vitest';
import type { EventEffect, RuleEffect, Scenario } from '@/engine/types';
import { validateScenario, validateScenarioList } from '@/engine/validation';
import {
  createAllPresets,
  getScenarioPreset,
  SCENARIO_PRESETS,
} from './index';

function hasFiniteNumericOperand(effect: RuleEffect | EventEffect): boolean {
  switch (effect.kind) {
    case 'increase':
    case 'decrease':
      return typeof effect.amount === 'number' && Number.isFinite(effect.amount);
    case 'assign':
      return typeof effect.value === 'number' && Number.isFinite(effect.value);
    case 'multiply':
      return typeof effect.factor === 'number' && Number.isFinite(effect.factor);
    case 'percentChange':
      return typeof effect.percent === 'number' && Number.isFinite(effect.percent);
    case 'temporary':
      return typeof effect.delta === 'number' && Number.isFinite(effect.delta);
    case 'conditional':
      return hasFiniteNumericOperand(effect.then)
        && (effect.otherwise === undefined || hasFiniteNumericOperand(effect.otherwise));
    case 'log':
    case 'activate':
    case 'cancel':
      return true;
  }
}

function allEffectsAreNumeric(scenario: Scenario): boolean {
  const rulesValid = scenario.rules.every((rule) => rule.effects.every(hasFiniteNumericOperand));
  const eventsValid = scenario.events.every((event) => (
    event.effects.every(hasFiniteNumericOperand)
    && (event.outcomes ?? []).every((outcome) => outcome.effects.every(hasFiniteNumericOperand))
  ));
  return rulesValid && eventsValid;
}

describe('scenario preset registry', () => {
  it('registers seven unique presets with stable ids', () => {
    expect(SCENARIO_PRESETS.map((preset) => preset.id)).toEqual([
      'economy', 'civilization', 'ecosystem', 'technology', 'geopolitics', 'supply-chain', 'urban',
    ]);
    expect(new Set(SCENARIO_PRESETS.map((preset) => preset.id)).size).toBe(SCENARIO_PRESETS.length);
    expect(getScenarioPreset('ecosystem')?.name).toBe('Ecosystem Feedbacks');
    expect(getScenarioPreset('missing')).toBeUndefined();
  });

  it('every preset passes validateScenario', () => {
    for (const scenario of createAllPresets()) {
      const result = validateScenario(scenario);
      expect(result.valid, `${scenario.id}: ${result.issues.map((issue) => issue.message).join(', ')}`).toBe(true);
      expect(result.issues).toEqual([]);
    }
    expect(validateScenarioList(createAllPresets()).valid).toBe(true);
  });

  it('uses shared deterministic configuration constraints in every preset', () => {
    for (const scenario of createAllPresets()) {
      const configuration = scenario.configuration;
      expect(configuration.stepDuration).toBe(1);
      expect(configuration.maxSteps).toBeGreaterThanOrEqual(30);
      expect(configuration.maxSteps).toBeLessThanOrEqual(200);
      expect(Number.isFinite(configuration.seed)).toBe(true);
      expect(configuration.mode).toBe('deterministic');
      expect(configuration.propagationLimit).toBeGreaterThanOrEqual(4);
      expect(configuration.autoSnapshotSteps).toBeGreaterThanOrEqual(5);
      expect(configuration.strictValidation).toBe(true);
    }
  });

  it('uses numeric rule/effect operands and bounded probabilities', () => {
    for (const scenario of createAllPresets()) {
      expect(allEffectsAreNumeric(scenario), `${scenario.id} has a non-numeric effect`).toBe(true);
      for (const event of scenario.events) {
        expect(event.probability, event.id).toBeGreaterThanOrEqual(0);
        expect(event.probability, event.id).toBeLessThanOrEqual(1);
        for (const outcome of event.outcomes ?? []) {
          expect(outcome.probability, outcome.id).toBeGreaterThanOrEqual(0);
          expect(outcome.probability, outcome.id).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('creates independent scenario objects for each call', () => {
    const first = createAllPresets();
    const second = createAllPresets();
    expect(first.map((scenario) => scenario.id)).toEqual(second.map((scenario) => scenario.id));
    expect(first[0]).not.toBe(second[0]);
    first[0]!.variables[0]!.initial = -999;
    expect(second[0]!.variables[0]!.initial).not.toBe(-999);

    for (const preset of SCENARIO_PRESETS) {
      expect(preset.create().id).toBe(preset.id);
    }
  });
});
