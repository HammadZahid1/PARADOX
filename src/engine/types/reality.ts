import type { EntityId } from './core';
import type { Timeline } from './timeline';
import type { EventEffect, EventOutcome } from './events';
import type { WorldState } from './world';

export type RealityStatus = 'idle' | 'running' | 'paused' | 'complete' | 'archived';

export interface DecisionAlternative {
  id: EntityId;
  name: string;
  description?: string;
  probability: number;
  outcome: EventOutcome;
}

export interface DecisionRecord {
  id: EntityId;
  name: string;
  step: number;
  time: number;
  selectedAlternativeId: EntityId;
  alternatives: DecisionAlternative[];
  rationale?: string;
}

export interface RealityBranch {
  id: EntityId;
  name: string;
  description?: string;
  parentId?: EntityId;
  branchPointStep: number;
  branchTime: number;
  divergenceEventId?: EntityId;
  divergenceReason?: string;
  initialState: WorldState;
  currentState: WorldState;
  timeline: Timeline;
  seed: number;
  status: RealityStatus;
  color: string;
  createdAt: number;
  decisions: DecisionRecord[];
  effectQueue?: readonly EventEffect[];
}

export interface BranchSummary {
  branchId: EntityId;
  steps: number;
  eventCount: number;
  snapshotCount: number;
  decisions: number;
  divergenceStep: number;
  lastEvent?: string;
}
