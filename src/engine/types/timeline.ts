import type { EntityId } from './core';
import type { EventRecord, WorldState } from './world';

export type HistoryKind =
  | 'world'
  | 'variable'
  | 'event'
  | 'step'
  | 'branch'
  | 'scenario'
  | 'snapshot'
  | 'restoration'
  | 'decision';

export interface HistoryEntry {
  id: EntityId;
  kind: HistoryKind;
  summary: string;
  step: number;
  time: number;
  timestamp: number;
  branchId: EntityId;
  detail?: string;
  severity?: string;
}

export interface TimelineSnapshot {
  id: EntityId;
  name: string;
  description?: string;
  branchId: EntityId;
  step: number;
  time: number;
  state: WorldState;
  createdAt: number;
  kind: 'manual' | 'auto' | 'branch' | 'decision';
}

export interface TimelineEntry {
  step: number;
  time: number;
  stateId: EntityId;
  changedVariables: readonly string[];
  eventIds: readonly EntityId[];
  checkpoint: boolean;
}

export interface Timeline {
  id: EntityId;
  branchId: EntityId;
  entries: TimelineEntry[];
  snapshots: TimelineSnapshot[];
  events: EventRecord[];
}
