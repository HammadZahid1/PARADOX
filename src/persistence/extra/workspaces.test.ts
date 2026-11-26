import { describe, expect, it } from 'vitest';
import { createAllPresets } from '@/engine/scenarios';
import { mergeWorkspaces, workspaceFromScenarios, workspaceScenarioIds } from './workspaces';

const presets = createAllPresets();
const first = presets[0]!;
const second = presets[1]!;

describe('workspace helpers', () => {
  it('creates a workspace from imported scenarios', () => {
    const workspace = workspaceFromScenarios('Climate Lab', [first, second]);
    expect(workspace.name).toBe('Climate Lab');
    expect(workspace.scenarioIds).toEqual([first.id, second.id]);
    expect(workspace.activeScenarioId).toBe(first.id);
    expect(workspace.settings.defaultView).toBe('universe');
    expect(workspace.version).toBe(1);
  });

  it('normalizes workspace names without identifiers', () => {
    expect(workspaceFromScenarios('!!!', [first]).id).toBe('workspace_default');
  });

  it('merges scenario lists and nested settings without duplicates', () => {
    const current = workspaceFromScenarios('Current', [first]);
    current.settings.panelSizes.left = 280;
    const incoming = workspaceFromScenarios('Incoming', [first, second]);
    incoming.settings.panelSizes.right = 320;
    incoming.settings.compactMode = true;
    const merged = mergeWorkspaces(current, incoming);
    expect(merged.name).toBe('Incoming');
    expect(merged.scenarioIds).toEqual([first.id, second.id]);
    expect(merged.settings.compactMode).toBe(true);
    expect(merged.settings.panelSizes).toEqual({ left: 280, right: 320 });
    expect(merged.version).toBe(current.version + 1);
    expect(current.settings.panelSizes).toEqual({ left: 280 });
  });

  it('resolves only scenarios that are actually available', () => {
    const workspace = workspaceFromScenarios('Filtered', [first, second]);
    expect(workspaceScenarioIds(workspace, [first])).toEqual([first]);
  });
});
