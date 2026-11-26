import { describe, expect, it } from 'vitest';
import type { WorldState } from '@/engine/types';
import { createInitialState } from '@/engine/core/state';
import { createSnapshot, deleteSnapshot, renameSnapshot, restoreSnapshot, snapshotAtOrBefore, snapshotsForBranch } from './snapshots';

const state: WorldState = { ...createInitialState({ definitions: [], seed: 1 }), step: 4, time: 8 };

describe('timeline snapshots', () => {
  it('captures an independent state', () => {
    const snapshot = createSnapshot(state, 'b1', 'Checkpoint');
    expect(snapshot.step).toBe(4);
    expect(snapshot.state).not.toBe(state);
    expect(restoreSnapshot(snapshot).variables).toEqual(state.variables);
    expect(restoreSnapshot(snapshot).id).not.toBe(state.id);
  });

  it('renames, filters and deletes snapshots', () => {
    const first = createSnapshot(state, 'b1', 'First');
    const second = createSnapshot({ ...state, step: 9 }, 'b2', 'Second', 'auto');
    expect(snapshotsForBranch([first, second], 'b1')).toHaveLength(1);
    expect(renameSnapshot([first], first.id, 'Renamed')[0]?.name).toBe('Renamed');
    expect(deleteSnapshot([first, second], first.id)).toHaveLength(1);
  });

  it('finds the latest snapshot at or before a step', () => {
    const first = createSnapshot(state, 'b1', 'First');
    const second = createSnapshot({ ...state, step: 9 }, 'b1', 'Second');
    expect(snapshotAtOrBefore([first, second], 6)?.name).toBe('First');
    expect(snapshotAtOrBefore([first, second], 12)?.name).toBe('Second');
  });
});
