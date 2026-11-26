import type { Scenario, TimelineSnapshot, Workspace } from '@/engine/types';

export interface LocalBackup {
  format: 'paradox-local-backup';
  version: 1;
  createdAt: number;
  workspace: Workspace;
  scenarios: Scenario[];
  snapshots: TimelineSnapshot[];
}

export function createLocalBackup(
  workspace: Workspace,
  scenarios: readonly Scenario[],
  snapshots: readonly TimelineSnapshot[] = [],
): LocalBackup {
  return {
    format: 'paradox-local-backup',
    version: 1,
    createdAt: Date.now(),
    workspace: structuredClone(workspace),
    scenarios: structuredClone([...scenarios]),
    snapshots: structuredClone([...snapshots]),
  };
}

export function serializeBackup(backup: LocalBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(text: string): LocalBackup | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Partial<LocalBackup>;
    if (record.format !== 'paradox-local-backup' || record.version !== 1) return null;
    if (!record.workspace || !Array.isArray(record.scenarios) || !Array.isArray(record.snapshots)) return null;
    return parsed as LocalBackup;
  } catch {
    return null;
  }
}

export function backupSummary(backup: LocalBackup): string {
  return `${backup.scenarios.length} scenarios · ${backup.snapshots.length} snapshots · ${backup.workspace.name}`;
}
