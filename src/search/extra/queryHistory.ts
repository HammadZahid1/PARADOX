/** Bounded local query history with deterministic normalization and deduplication. */

import { normalizeQueryText, resolveInteger } from './tokenizer';

export const DEFAULT_HISTORY_LIMIT = 20;

export interface QueryHistoryState {
  /** Most-recent normalized query first. */
  readonly entries: readonly string[];
}

export function createQueryHistory(): QueryHistoryState {
  return { entries: [] };
}

/** Normalized identity used for history storage and lookup. */
export function normalizeHistoryQuery(query: unknown): string {
  return normalizeQueryText(query);
}

function resolveState(state: QueryHistoryState | null | undefined): QueryHistoryState {
  if (state === null || typeof state !== 'object') return createQueryHistory();
  const source = Array.isArray(state.entries) ? (state.entries as readonly unknown[]) : [];
  const entries: string[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    const normalized = normalizeHistoryQuery(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    entries.push(normalized);
  }
  return { entries };
}

/** Record a normalized query, promoting duplicates and enforcing the bound. */
export function recordQuery(
  state: QueryHistoryState,
  query: unknown,
  limit: number = DEFAULT_HISTORY_LIMIT,
): QueryHistoryState {
  const current = resolveState(state);
  const capacity = resolveInteger(limit, DEFAULT_HISTORY_LIMIT, 0);
  const normalized = normalizeHistoryQuery(query);
  if (!normalized || capacity === 0) return current;
  const entries = [normalized, ...current.entries.filter((entry) => entry !== normalized)].slice(0, capacity);
  return { entries };
}

/** Defensive copy of history entries in most-recent-first order. */
export function listQueryHistory(state: QueryHistoryState): string[] {
  return [...resolveState(state).entries];
}

/** One-based recency rank; higher means more recent, zero means absent. */
export function queryHistoryRank(state: QueryHistoryState, query: unknown): number {
  const index = resolveState(state).entries.indexOf(normalizeHistoryQuery(query));
  if (index < 0) return 0;
  return resolveState(state).entries.length - index;
}

/** Reset to an empty history. */
export function clearQueryHistory(): QueryHistoryState {
  return createQueryHistory();
}
