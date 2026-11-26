import type { Scenario, TimelineSnapshot, Workspace } from '@/engine/types';
import type { ImportEnvelope } from '@/engine/validation';

export const EXPORT_VERSION = 1;

function envelope(format: ImportEnvelope['format'], payload: unknown): ImportEnvelope {
  return { format, version: EXPORT_VERSION, payload };
}

export function exportScenario(scenario: Scenario): string {
  return JSON.stringify(envelope('paradox-scenario', scenario), null, 2);
}

export function exportWorkspace(workspace: Workspace, scenarios: readonly Scenario[]): string {
  return JSON.stringify(envelope('paradox-workspace', { workspace, scenarios }), null, 2);
}

export function exportSnapshot(snapshot: TimelineSnapshot): string {
  return JSON.stringify(envelope('paradox-snapshot', snapshot), null, 2);
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
