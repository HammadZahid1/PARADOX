import type { EntityId } from './core';

export interface WorkspaceSettings {
  compactMode: boolean;
  reducedMotion: boolean;
  showGrid: boolean;
  defaultView: string;
  theme: 'void' | 'graphite';
  panelSizes: Record<string, number>;
}

export interface Workspace {
  id: EntityId;
  name: string;
  description?: string;
  scenarioIds: EntityId[];
  activeScenarioId?: EntityId;
  settings: WorkspaceSettings;
  createdAt: number;
  updatedAt: number;
  version: number;
}
