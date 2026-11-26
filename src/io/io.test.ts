import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/engine/core/state';
import { createAllPresets } from '@/engine/scenarios';
import { createSnapshot } from '@/engine/timeline/snapshots';
import { exportScenario, exportSnapshot, exportWorkspace } from './export';
import { createImportPlan, importScenario, importWorkspace } from './import';

const scenario = createAllPresets()[0]!;

describe('local import and export', () => {
  it('round-trips a validated scenario', () => {
    const text = exportScenario(scenario);
    expect(text).toContain('"format": "paradox-scenario"');
    expect(importScenario(text)).toEqual(scenario);
  });

  it('round-trips a workspace with scenarios', () => {
    const workspace = {
      id: 'workspace_test', name: 'Test', scenarioIds: [scenario.id], activeScenarioId: scenario.id,
      settings: { compactMode: false, reducedMotion: false, showGrid: true, defaultView: 'lab', theme: 'void' as const, panelSizes: {} },
      createdAt: 1, updatedAt: 2, version: 1,
    };
    const result = importWorkspace(exportWorkspace(workspace, [scenario]));
    expect(result?.workspace.name).toBe('Test');
    expect(result?.scenarios).toHaveLength(1);
  });

  it('rejects invalid envelopes and payloads', () => {
    expect(createImportPlan('{}')).toBeNull();
    const plan = createImportPlan(JSON.stringify({ format: 'paradox-scenario', version: 1, payload: { id: 'x' } }));
    expect(plan?.payload).toBeNull();
    expect(plan?.issues.length).toBeGreaterThan(0);
  });

  it('exports snapshots with a versioned envelope', () => {
    const initial = createInitialState({ definitions: scenario.variables, seed: scenario.configuration.seed });
    const snapshot = createSnapshot(initial, 'branch_1', 'Initial checkpoint');
    const text = exportSnapshot(snapshot);
    expect(text).toContain('"format": "paradox-snapshot"');
    expect(text).toContain('Initial checkpoint');
  });
});
