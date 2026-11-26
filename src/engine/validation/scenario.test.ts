import { describe, expect, it } from 'vitest';
import type { Scenario } from '@/engine/types';
import { scenarioSummary, validateScenario, validateScenarioList } from './scenario';

const scenario: Scenario = {
  id: 's1', name: 'Economy', description: '', domain: 'economics', worldId: 'w1',
  variables: [{ id: 'v1', key: 'growth', name: 'Growth', type: 'number', initial: 1 }],
  parameters: {}, rules: [], events: [],
  configuration: { stepDuration: 1, maxSteps: 10, seed: 7, mode: 'deterministic', propagationLimit: 8, autoSnapshotSteps: 5, strictValidation: true },
  objectives: [{ id: 'o1', name: 'Growth', variableKey: 'growth', target: 3, operator: 'gte' }],
  tags: [], preset: false, createdAt: 0, updatedAt: 0, version: 1,
};

describe('scenario validation', () => {
  it('validates a complete scenario', () => {
    expect(validateScenario(scenario).valid).toBe(true);
    expect(scenarioSummary(scenario)).toContain('1 variables');
  });

  it('rejects invalid configuration and objective references', () => {
    expect(validateScenario({ ...scenario, configuration: { ...scenario.configuration, maxSteps: 0 } }).valid).toBe(false);
    expect(validateScenario({ ...scenario, objectives: [{ id: 'o2', name: 'x', variableKey: 'missing', target: 1, operator: 'gte' }] }).valid).toBe(false);
  });

  it('detects duplicate scenario ids', () => {
    expect(validateScenarioList([scenario, scenario]).valid).toBe(false);
  });
});
