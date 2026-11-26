import type { Scenario, Workspace } from '@/engine/types';

export function workspaceFromScenarios(name: string, scenarios: readonly Scenario[]): Workspace {
  const now = Date.now();
  return {
    id: `workspace_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'default'}`,
    name,
    description: 'Local PARADOX workspace',
    scenarioIds: scenarios.map((scenario) => scenario.id),
    activeScenarioId: scenarios[0]?.id,
    settings: { compactMode: false, reducedMotion: false, showGrid: true, defaultView: 'universe', theme: 'void', panelSizes: {} },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function mergeWorkspaces(current: Workspace, incoming: Workspace): Workspace {
  const scenarioIds = [...new Set([...current.scenarioIds, ...incoming.scenarioIds])];
  return {
    ...current,
    name: incoming.name || current.name,
    scenarioIds,
    activeScenarioId: incoming.activeScenarioId ?? current.activeScenarioId,
    settings: { ...current.settings, ...incoming.settings, panelSizes: { ...current.settings.panelSizes, ...incoming.settings.panelSizes } },
    updatedAt: Date.now(),
    version: Math.max(current.version, incoming.version) + 1,
  };
}

export function workspaceScenarioIds(workspace: Workspace, available: readonly Scenario[]): Scenario[] {
  const ids = new Set(workspace.scenarioIds);
  return available.filter((scenario) => ids.has(scenario.id));
}
