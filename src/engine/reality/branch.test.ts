import { describe, expect, it } from 'vitest';
import type { WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { appendTimelineEntry, createTimeline } from '@/engine/timeline/timeline';
import { createSnapshot } from '@/engine/timeline/snapshots';
import { branchAncestry, branchChildren, branchFromEvent, branchFromSnapshot, branchFromState, branchTree, createReality, renameBranch } from './branch';

const state: WorldState = { ...createInitialState({ definitions: [], seed: 5 }), step: 3, time: 3 };
const parent = createReality({ name: 'Prime', state, seed: 5 });

describe('alternate reality branching', () => {
  it('creates independent branch states', () => {
    const child = branchFromState(parent, state, 'Deviation', 'test');
    child.currentState.variables.injected = true;
    expect(parent.currentState.variables.injected).toBeUndefined();
    expect(child.parentId).toBe(parent.id);
    expect(child.branchPointStep).toBe(3);
  });

  it('branches from snapshots and events', () => {
    const snapshot = createSnapshot(state, parent.id, 'Checkpoint');
    expect(branchFromSnapshot(parent, snapshot, 'Snapshot branch').branchPointStep).toBe(3);
    const event = { id: 'r', eventId: 'e1', eventName: 'Shock', step: 2, time: 2, severity: 'warning', source: 'test', affectedVariables: [] };
    const withEvent = { ...parent, timeline: appendTimelineEntry(parent.timeline, state, [], [event]) };
    const branched = branchFromEvent(withEvent, 'e1', 'Event branch');
    expect(branched.divergenceEventId).toBe('e1');
    expect(branched.branchPointStep).toBe(2);
  });

  it('tracks ancestry, children and rename', () => {
    const child = branchFromState(parent, state, 'Child', 'test');
    const grandchild = branchFromState(child, state, 'Grandchild', 'test');
    const branches = [parent, child, grandchild];
    expect(branchAncestry(branches, grandchild.id).map((branch) => branch.name)).toEqual(['Prime', 'Child', 'Grandchild']);
    expect(branchChildren(branches, parent.id)).toHaveLength(1);
    expect(branchTree(branches)).toHaveLength(3);
    expect(renameBranch(child, 'Renamed').name).toBe('Renamed');
  });

  it('rejects unknown events', () => {
    expect(() => branchFromEvent(parent, 'missing', 'Bad')).toThrow();
  });
});
