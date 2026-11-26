import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import { compareBranches, compareSnapshots } from './index';

const state = createInitialState({
  definitions: [{ id: 'v', key: 'value', name: 'Value', type: 'number', initial: 1 }],
  seed: 1,
});

function branch(id: string) {
  return {
    id,
    name: id,
    branchPointStep: 0,
    branchTime: 0,
    initialState: state,
    currentState: state,
    timeline: { id: `tl-${id}`, branchId: id, entries: [], snapshots: [], events: [] },
    seed: 1,
    status: 'idle' as const,
    color: '#fff',
    createdAt: 1,
    decisions: [],
  };
}

describe('comparison barrel', () => {
  it('re-exports compareBranches', () => {
    const result = compareBranches(branch('a'), branch('b'), []);
    expect(result.leftBranchId).toBe('a');
    expect(result.rightBranchId).toBe('b');
    expect(result.differences).toEqual([]);
  });

  it('re-exports compareSnapshots', () => {
    expect(compareSnapshots(state, state, []).changedVariables).toEqual([]);
  });

  it('exports pure comparisons for identical inputs', () => {
    const first = compareBranches(branch('a'), branch('b'), []);
    const second = compareBranches(branch('a'), branch('b'), []);
    expect(first.id).toBe(second.id);
    expect(first.trajectories).toEqual([]);
  });
});
