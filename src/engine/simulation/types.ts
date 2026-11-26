import type { CausalPropagationStep, EventRecord, HistoryEntry, RealityBranch, Scenario, TimelineSnapshot, VariableChange, WorldState } from '@/engine/types';

export type ConsoleKind =
  | 'init' | 'transition' | 'event' | 'probability' | 'variable'
  | 'causal' | 'branch' | 'snapshot' | 'control' | 'decision' | 'error';

export interface ConsoleEntry {
  id: string;
  step: number;
  time: number;
  kind: ConsoleKind;
  message: string;
  severity: 'info' | 'notice' | 'warning' | 'critical';
  branchId: string;
  timestamp: number;
}

export interface StepResult {
  state: WorldState;
  changes: VariableChange[];
  fired: EventRecord[];
  propagation: CausalPropagationStep[];
  branchId: string;
  snapshotId?: string;
}

export interface EngineSnapshotSummary {
  scenario: Scenario;
  branch: RealityBranch;
  snapshots: TimelineSnapshot[];
  history: HistoryEntry[];
}
