import type { EntityId, HistoryEntry, HistoryKind } from '@/engine/types';
import { createId } from '@/utils/id';

export function createHistoryEntry(
  kind: HistoryKind,
  summary: string,
  branchId: EntityId,
  step: number,
  time: number,
  detail?: string,
  severity = 'info',
): HistoryEntry {
  return { id: createId('hist'), kind, summary, branchId, step, time, timestamp: Date.now(), detail, severity };
}

export function appendHistory(history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...history, entry];
}

export function filterHistory(history: readonly HistoryEntry[], options: { kind?: HistoryKind; branchId?: EntityId; sinceStep?: number; query?: string }): HistoryEntry[] {
  const query = options.query?.toLowerCase();
  return history.filter((entry) => {
    if (options.kind && entry.kind !== options.kind) return false;
    if (options.branchId && entry.branchId !== options.branchId) return false;
    if (options.sinceStep !== undefined && entry.step < options.sinceStep) return false;
    if (query && !`${entry.summary} ${entry.detail ?? ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function historySummary(history: readonly HistoryEntry[]): Record<HistoryKind, number> {
  const result: Record<HistoryKind, number> = {
    world: 0, variable: 0, event: 0, step: 0, branch: 0,
    scenario: 0, snapshot: 0, restoration: 0, decision: 0,
  };
  for (const entry of history) result[entry.kind] += 1;
  return result;
}
