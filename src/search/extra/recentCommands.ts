/** Bounded, timestamp-free LRU tracking for recently used command ids. */

import { slugify } from '@/utils/text';
import { normalizeQueryText, resolveInteger, roundScore } from './tokenizer';

export const DEFAULT_RECENT_LIMIT = 8;
export const MAX_RECENT_BOOST = 0.05;

export interface RecentCommandState {
  /** Most-recent id first; ids are normalized slugs. */
  readonly ids: readonly string[];
  /** Logical operation counter, never derived from wall-clock time. */
  readonly clock: number;
}

/** Normalize a command id for LRU identity and ranking lookups. */
export function normalizeCommandId(value: unknown): string {
  return slugify(normalizeQueryText(value));
}

export function createRecentCommands(): RecentCommandState {
  return { ids: [], clock: 0 };
}

function resolveState(state: RecentCommandState | null | undefined): RecentCommandState {
  if (state === null || typeof state !== 'object') return createRecentCommands();
  const source = Array.isArray(state.ids) ? (state.ids as readonly unknown[]) : [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    const id = normalizeCommandId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  const clock =
    typeof state.clock === 'number' && Number.isFinite(state.clock) ? Math.max(0, Math.floor(state.clock)) : 0;
  return { ids, clock };
}

/** Return a new state with `id` promoted to the front and the LRU bound applied. */
export function recordCommand(
  state: RecentCommandState,
  id: unknown,
  limit: number = DEFAULT_RECENT_LIMIT,
): RecentCommandState {
  const current = resolveState(state);
  const capacity = resolveInteger(limit, DEFAULT_RECENT_LIMIT, 0);
  const normalized = normalizeCommandId(id);
  if (!normalized || capacity === 0) return { ids: [], clock: current.clock + 1 };
  const ids = [normalized, ...current.ids.filter((entry) => entry !== normalized)].slice(0, capacity);
  return { ids, clock: current.clock + 1 };
}

/** Defensive copy of the current LRU order. */
export function recentCommandsList(state: RecentCommandState): string[] {
  return [...resolveState(state).ids];
}

/** Zero-based position of an id, or -1 when absent. */
export function recentCommandIndex(state: RecentCommandState, id: unknown): number {
  return resolveState(state).ids.indexOf(normalizeCommandId(id));
}

/** Deterministic ranking boost in [0, MAX_RECENT_BOOST]; absent ids score zero. */
export function recentBoost(state: RecentCommandState, id: unknown, limit: number = DEFAULT_RECENT_LIMIT): number {
  const index = recentCommandIndex(state, id);
  if (index < 0) return 0;
  const capacity = Math.max(1, resolveInteger(limit, DEFAULT_RECENT_LIMIT, 0));
  return roundScore(MAX_RECENT_BOOST * (1 - index / capacity));
}

/** Reset to an empty LRU. */
export function clearRecentCommands(): RecentCommandState {
  return createRecentCommands();
}
