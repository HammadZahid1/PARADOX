import { describe, expect, it, vi } from 'vitest';
import type { Scenario, SimulationEvent, SimulationRule } from '@/engine/types';
import { stateFingerprint } from '@/engine/core/state';
import { SimulationEngine } from './engine';

const rules: SimulationRule[] = [{
  id: 'r1', name: 'Consumption', priority: 1, enabled: true,
  effects: [{ kind: 'decrease', variableKey: 'resources', amount: 2 }],
}];
const event: SimulationEvent = {
  id: 'e1', name: 'Discovery', type: 'scheduled', trigger: { kind: 'scheduled', atStep: 2 },
  probability: 1, conditions: [], effects: [{ kind: 'increase', variableKey: 'resources', amount: 10 }],
  dependencies: [], priority: 1, severity: 'notice', enabled: true,
};
const scenario = (seed = 7): Scenario => ({
  id: 's1', name: 'Test', description: '', domain: 'test', worldId: 'w1',
  variables: [
    { id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 100, min: 0, max: 500 },
    { id: 'v2', key: 'stability', name: 'Stability', type: 'number', initial: 50, min: 0, max: 100 },
  ],
  parameters: {}, rules, events: [event],
  configuration: { stepDuration: 1, maxSteps: 10, seed, mode: 'deterministic', propagationLimit: 4, autoSnapshotSteps: 2, strictValidation: true },
  objectives: [], tags: [], preset: false, createdAt: 0, updatedAt: 0, version: 1,
});

describe('simulation engine orchestration', () => {
  it('produces identical results for identical seeds', () => {
    const a = new SimulationEngine(scenario());
    const b = new SimulationEngine(scenario());
    a.run(4);
    b.run(4);
    expect(stateFingerprint(a.activeBranch.currentState)).toBe(stateFingerprint(b.activeBranch.currentState));
  });

  it('applies rules, scheduled events and records history', () => {
    const engine = new SimulationEngine(scenario());
    const results = engine.run(2);
    expect(results).toHaveLength(2);
    expect(results[1]?.fired).toHaveLength(1);
    expect(engine.activeBranch.timeline.entries).toHaveLength(3);
    expect(engine.historyList.some((entry) => entry.kind === 'event')).toBe(true);
    expect(engine.consoleEntries.some((entry) => entry.kind === 'event')).toBe(true);
  });

  it('creates automatic snapshots and restores them', () => {
    const engine = new SimulationEngine(scenario());
    engine.run(2);
    expect(engine.snapshotsList.length).toBeGreaterThan(0);
    const snapshot = engine.snapshotsList[0]!;
    engine.step();
    expect(engine.restoreSnapshot(snapshot.id)).toBe(true);
    expect(engine.activeBranch.currentState.step).toBe(snapshot.step);
  });

  it('keeps branches isolated', () => {
    const engine = new SimulationEngine(scenario());
    engine.step();
    const child = engine.createBranch('Alternative')!;
    engine.selectBranch(child.id);
    engine.injectEvent({ ...event, id: 'manual', trigger: { kind: 'manual' }, effects: [{ kind: 'increase', variableKey: 'resources', amount: 25 }] });
    const parent = engine.getBranch(engine.branchesList[0]!.id)!;
    expect(engine.getBranch(child.id)!.currentState.variables.v1).not.toBe(parent.currentState.variables.v1);
  });

  it('adjusts variables with causal propagation and supports cancellation', () => {
    const engine = new SimulationEngine(scenario());
    expect(engine.adjustVariable('resources', 200)).toBe(true);
    expect(engine.activeBranch.currentState.variables.v1).toBe(200);
    const onProgress = vi.fn();
    engine.run(3, onProgress, () => true);
    expect(onProgress).not.toHaveBeenCalled();
    engine.reset();
    expect(engine.activeBranch.currentState.step).toBe(0);
  });
});
