import { describe, expect, it } from 'vitest';
import type { TimelineSnapshot, VariableDefinition, WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { compareSnapshots } from './snapshot';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'population', name: 'Population', type: 'number', initial: 10 },
  { id: 'v2', key: 'active', name: 'Active', type: 'boolean', initial: false },
  { id: 'v3', key: 'category', name: 'Category', type: 'categorical', initial: 'alpha' },
];

function state(
  population: number,
  active: boolean,
  step: number,
  metrics: Record<string, number>,
): WorldState {
  const base = createInitialState({ definitions, seed: 3 });
  return {
    ...base,
    step,
    time: step,
    variables: { v1: population, v2: active, v3: 'alpha' },
    metrics,
  };
}

function snapshot(id: string, value: WorldState): TimelineSnapshot {
  return {
    id,
    name: id,
    branchId: 'branch',
    step: value.step,
    time: value.time,
    state: value,
    createdAt: 1,
    kind: 'manual',
  };
}

describe('compareSnapshots', () => {
  it('returns only changed variables and metric deltas between snapshots', () => {
    const left = snapshot('left', state(10, false, 2, { totalEvents: 1, totalChanges: 2 }));
    const right = snapshot('right', state(12, true, 3, { totalEvents: 1, totalChanges: 5, rare: 4 }));
    const comparison = compareSnapshots(left, right, definitions);

    expect(comparison.leftId).toBe('left');
    expect(comparison.rightId).toBe('right');
    expect(comparison.leftStep).toBe(2);
    expect(comparison.rightStep).toBe(3);
    expect(comparison.changedVariables).toHaveLength(2);
    expect(comparison.changedVariables[0]).toMatchObject({
      key: 'population', left: 10, right: 12, absolute: 2, relative: 0.2,
    });
    expect(comparison.changedVariables[1]).toMatchObject({
      key: 'active', left: false, right: true, absolute: 1, relative: null,
    });
    expect(comparison.metricDeltas).toEqual([
      { key: 'rare', left: 0, right: 4, delta: 4, relative: null },
      { key: 'totalChanges', left: 2, right: 5, delta: 3, relative: 1.5 },
      { key: 'totalEvents', left: 1, right: 1, delta: 0, relative: 0 },
    ]);
  });

  it('accepts raw world states and reports null deltas for categorical changes', () => {
    const left = state(10, false, 0, { score: 4 });
    const right = { ...state(10, true, 1, {}), variables: { ...state(10, true, 1, {}).variables, v3: 'beta' } };
    const comparison = compareSnapshots(left, right, definitions);

    expect(comparison.changedVariables.map((item) => item.key)).toEqual(['active', 'category']);
    expect(comparison.changedVariables[1]).toMatchObject({ absolute: null, relative: null });
    expect(comparison.metricDeltas).toEqual([{ key: 'score', left: 4, right: 0, delta: -4, relative: -1 }]);
  });

  it('does not mutate source states or alias comparison results', () => {
    const left = state(10, false, 1, { score: 1 });
    const right = state(11, false, 1, { score: 2 });
    const comparison = compareSnapshots(left, right, definitions);
    const changed = comparison.changedVariables[0];
    if (changed) changed.left = 999;
    right.variables['v1'] = 50;

    expect(comparison.changedVariables[0]?.left).toBe(999);
    expect(left.variables['v1']).toBe(10);
    expect(compareSnapshots(left, right, definitions).changedVariables[0]?.right).toBe(50);
    expect(compareSnapshots(left, left, definitions).changedVariables).toEqual([]);
  });
});
