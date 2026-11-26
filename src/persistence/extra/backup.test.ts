import { describe, expect, it } from 'vitest';
import { createAllPresets } from '@/engine/scenarios';
import { createInitialState } from '@/engine/core/state';
import { createSnapshot } from '@/engine/timeline/snapshots';
import { backupSummary, createLocalBackup, parseBackup, serializeBackup } from './backup';

const scenario = createAllPresets()[0]!;
const workspace = {
  id: 'workspace_backup', name: 'Backup lab', scenarioIds: [scenario.id], activeScenarioId: scenario.id,
  settings: { compactMode: false, reducedMotion: false, showGrid: true, defaultView: 'lab', theme: 'void' as const, panelSizes: {} },
  createdAt: 1, updatedAt: 2, version: 1,
};

describe('local backup', () => {
  it('round-trips a complete browser-only backup', () => {
    const snapshot = createSnapshot(createInitialState({ definitions: scenario.variables, seed: 1 }), 'branch_1', 'Start');
    const backup = createLocalBackup(workspace, [scenario], [snapshot]);
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed?.workspace.name).toBe('Backup lab');
    expect(parsed?.scenarios).toHaveLength(1);
    expect(parsed?.snapshots[0]?.name).toBe('Start');
    expect(backupSummary(backup)).toContain('1 scenarios');
  });

  it('rejects unknown formats and malformed JSON', () => {
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup(JSON.stringify({ format: 'other', version: 1 }))).toBeNull();
  });
});
