import type { EntityId, RealityBranch, TimelineSnapshot, WorldState } from '@/engine/types';
import { cloneState, restoreState } from '@/engine/core/state';
import { createTimeline, appendTimelineEntry } from '@/engine/timeline/timeline';
import { createId } from '@/utils/id';

const BRANCH_COLORS = ['#3ddbd9', '#8b7cf6', '#e5a94c', '#e25656', '#4ade80', '#60a5fa', '#f472b6'];

export function chooseBranchColor(index: number): string {
  return BRANCH_COLORS[index % BRANCH_COLORS.length]!;
}

export interface CreateRealityOptions {
  name: string;
  description?: string;
  state: WorldState;
  seed: number;
  parentId?: EntityId;
  branchPointStep?: number;
  divergenceEventId?: EntityId;
  divergenceReason?: string;
  color?: string;
  index?: number;
}

export function createReality(options: CreateRealityOptions): RealityBranch {
  const initial = cloneState(options.state);
  const timeline = appendTimelineEntry(createTimeline('pending'), initial, [], [], true);
  const id = createId('branch');
  const branch: RealityBranch = {
    id,
    name: options.name,
    description: options.description,
    parentId: options.parentId,
    branchPointStep: options.branchPointStep ?? initial.step,
    branchTime: initial.time,
    divergenceEventId: options.divergenceEventId,
    divergenceReason: options.divergenceReason,
    initialState: initial,
    currentState: cloneState(initial),
    timeline: { ...timeline, branchId: id },
    seed: options.seed,
    status: 'idle',
    color: options.color ?? chooseBranchColor(options.index ?? 0),
    createdAt: Date.now(),
    decisions: [],
  };
  return branch;
}

/** Branch from arbitrary state: the parent branch and snapshot data are never mutated. */
export function branchFromState(parent: RealityBranch, state: WorldState, name: string, reason: string, eventId?: EntityId): RealityBranch {
  return createReality({
    name,
    state,
    seed: parent.seed,
    parentId: parent.id,
    branchPointStep: state.step,
    divergenceEventId: eventId,
    divergenceReason: reason,
    index: 1,
  });
}

export function branchFromSnapshot(parent: RealityBranch, snapshot: TimelineSnapshot, name: string): RealityBranch {
  return branchFromState(parent, restoreState(snapshot.state), name, `snapshot:${snapshot.name}`);
}

export function branchFromEvent(parent: RealityBranch, eventId: EntityId, name: string): RealityBranch {
  const event = parent.timeline.events.find((record) => record.eventId === eventId);
  if (!event) throw new Error(`Unknown event ${eventId}`);
  const state = restoreState(parent.currentState);
  state.step = event.step;
  state.time = event.time;
  return branchFromState(parent, state, name, `event:${event.eventName}`, eventId);
}

export function renameBranch(branch: RealityBranch, name: string): RealityBranch {
  return { ...branch, name };
}

export function branchAncestry(branches: readonly RealityBranch[], branchId: EntityId): RealityBranch[] {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const chain: RealityBranch[] = [];
  let current = byId.get(branchId);
  const visited = new Set<EntityId>();
  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain.reverse();
}

export function branchChildren(branches: readonly RealityBranch[], parentId: EntityId): RealityBranch[] {
  return branches.filter((branch) => branch.parentId === parentId);
}

export function branchTree(branches: readonly RealityBranch[]): Array<{ branch: RealityBranch; depth: number }> {
  const result: Array<{ branch: RealityBranch; depth: number }> = [];
  const walk = (parentId: EntityId | undefined, depth: number): void => {
    const children = parentId === undefined
      ? branches.filter((branch) => !branch.parentId)
      : branchChildren(branches, parentId);
    for (const child of children) {
      result.push({ branch: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return result;
}
