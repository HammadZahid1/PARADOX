import type { EntityId, TimelineSnapshot, WorldState } from '@/engine/types';
import { cloneState, restoreState } from '@/engine/core/state';
import { createId } from '@/utils/id';

export function createSnapshot(
  state: WorldState,
  branchId: EntityId,
  name: string,
  kind: TimelineSnapshot['kind'] = 'manual',
  description?: string,
): TimelineSnapshot {
  return {
    id: createId('snap'), name, description, branchId,
    step: state.step, time: state.time,
    state: cloneState(state), createdAt: Date.now(), kind,
  };
}

export function restoreSnapshot(snapshot: TimelineSnapshot): WorldState {
  return restoreState(snapshot.state);
}

export function deleteSnapshot(snapshots: readonly TimelineSnapshot[], id: EntityId): TimelineSnapshot[] {
  return snapshots.filter((snapshot) => snapshot.id !== id);
}

export function renameSnapshot(snapshots: readonly TimelineSnapshot[], id: EntityId, name: string): TimelineSnapshot[] {
  return snapshots.map((snapshot) => snapshot.id === id ? { ...snapshot, name } : snapshot);
}

export function snapshotAtOrBefore(snapshots: readonly TimelineSnapshot[], step: number): TimelineSnapshot | undefined {
  return snapshots.filter((snapshot) => snapshot.step <= step).sort((a, b) => b.step - a.step)[0];
}

export function snapshotsForBranch(snapshots: readonly TimelineSnapshot[], branchId: EntityId): TimelineSnapshot[] {
  return snapshots.filter((snapshot) => snapshot.branchId === branchId);
}
