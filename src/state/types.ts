import type { EntityId, Scenario, Workspace } from '@/engine/types';

export type ViewId =
  | 'lab' | 'timeline' | 'universe' | 'causal' | 'compare' | 'analytics'
  | 'scenarios' | 'world' | 'events' | 'explorer' | 'history'
  | 'snapshots' | 'decisions' | 'monte' | 'settings';

export type PanelId = 'navigator' | 'inspector' | 'console' | 'controls';

export interface ToastMessage {
  id: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
}

export interface ModalState {
  kind: 'newScenario' | 'newBranch' | 'injectEvent' | 'import' | 'export' | 'snapshot' | 'confirm' | null;
  payload?: unknown;
}

export interface SelectionState {
  branchId?: EntityId;
  eventId?: EntityId;
  variableKey?: string;
  nodeId?: EntityId;
  snapshotId?: EntityId;
}

export interface StoreSnapshot {
  workspace: Workspace;
  scenarios: Scenario[];
  activeScenarioId?: EntityId;
}
