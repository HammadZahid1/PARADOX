import { describe, expect, it } from 'vitest';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from '@/engine/simulation/engine';
import { validateScenario } from '@/engine/validation';
import { createExtraPresets, EXTRA_PRESETS } from './index';

const EXPECTED_IDS = [
  'extra-healthcare',
  'extra-energy',
  'extra-climate',
  'extra-traffic',
  'extra-market',
  'extra-education',
  'extra-manufacturing',
  'extra-research',
  'extra-disaster',
  'extra-kitchen-sink',
];

function fingerprint(id: string, scenarioIndex: number): string {
  const scenario = createExtraPresets()[scenarioIndex]!;
  expect(scenario.id).toBe(id);
  const engine = new SimulationEngine(scenario);
  engine.run(6);
  return stateFingerprint(engine.activeBranch.currentState);
}

describe('extra preset registry', () => {
  it('registers all ten presets with stable, unique ids', () => {
    const ids = EXTRA_PRESETS.map((preset) => preset.id);
    expect(ids).toEqual(EXPECTED_IDS);
    expect(new Set(ids).size).toBe(10);
    for (const preset of EXTRA_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.domain.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
      expect(typeof preset.create).toBe('function');
    }
  });

  it('creates ten unique, valid scenarios from the registry', () => {
    const scenarios = createExtraPresets();
    expect(scenarios).toHaveLength(10);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(10);
    expect(scenarios.map((scenario) => scenario.id)).toEqual(EXPECTED_IDS);
    for (const [index, scenario] of scenarios.entries()) {
      expect(scenario.id, EXTRA_PRESETS[index]?.id).toBe(EXTRA_PRESETS[index]?.id);
      expect(scenario.preset).toBe(true);
      expect(scenario.disclaimer).toBeTruthy();
      const result = validateScenario(scenario);
      expect(result.valid, `${scenario.id}: ${result.issues.map((issue) => issue.message).join(', ')}`).toBe(true);
      expect(result.issues, scenario.id).toEqual([]);
    }
  });

  it('replays every registry preset deterministically from its own seed', () => {
    for (const [index, id] of EXPECTED_IDS.entries()) {
      expect(fingerprint(id, index), id).toBe(fingerprint(id, index));
    }
  });

  it('returns independent scenario objects on each call', () => {
    const first = createExtraPresets();
    const second = createExtraPresets();
    expect(first.map((scenario) => scenario.id)).toEqual(second.map((scenario) => scenario.id));
    expect(first[0]).not.toBe(second[0]);
    first[0]!.variables[0]!.initial = -999;
    expect(second[0]!.variables[0]!.initial).not.toBe(-999);
  });
});
