/** Stable candidate ranking with optional facet filters and recency boosts. */

import type { FacetDocument, FacetFilters } from './facets';
import { facetMatches, hasFacetFilters } from './facets';
import type { RecentCommandState } from './recentCommands';
import { recentBoost } from './recentCommands';
import { compareText, normalizeQueryText, resolveInteger, roundScore } from './tokenizer';

export interface RankCandidate<T extends FacetDocument = FacetDocument> {
  readonly item: T;
  readonly score: number;
}

export interface RankOptions {
  readonly filters?: FacetFilters;
  readonly recent?: RecentCommandState;
  /** Multiplier applied to the recent-command boost; defaults to 1. */
  readonly recencyWeight?: number;
  readonly limit?: number;
}

export interface RankedResult<T extends FacetDocument = FacetDocument> {
  readonly item: T;
  readonly score: number;
  readonly rank: number;
  readonly boost: number;
}

interface RankRow<T extends FacetDocument> {
  readonly item: T;
  readonly base: number;
  readonly boost: number;
  readonly id: string;
  readonly index: number;
}

function rowScore<T extends FacetDocument>(row: RankRow<T>): number {
  return roundScore(row.base + row.boost);
}

/** Rank candidates by score, then normalized id, then original input position. */
export function rankCandidates<T extends FacetDocument>(
  candidates: readonly RankCandidate<T>[],
  options: RankOptions = {},
): RankedResult<T>[] {
  const source = Array.isArray(candidates) ? (candidates as readonly unknown[]) : [];
  const settings: RankOptions = options === null || typeof options !== 'object' ? {} : options;
  const filters = settings.filters ?? {};
  const recent = settings.recent;
  const weight =
    typeof settings.recencyWeight === 'number' && Number.isFinite(settings.recencyWeight) && settings.recencyWeight >= 0
      ? settings.recencyWeight
      : 1;
  const limit = resolveInteger(settings.limit, source.length, 0);
  const rows: RankRow<T>[] = [];

  for (const [index, entry] of source.entries()) {
    if (entry === null || typeof entry !== 'object') continue;
    const candidate = entry as RankCandidate<T>;
    const item = candidate.item;
    if (item === null || typeof item !== 'object') continue;
    if (hasFacetFilters(filters) && !facetMatches(item, filters)) continue;

    const base = typeof candidate.score === 'number' && Number.isFinite(candidate.score) ? candidate.score : 0;
    const id = normalizeQueryText(item.id) || `index:${index}`;
    const boost = recent ? recentBoost(recent, id) * weight : 0;
    rows.push({ item, base, boost, id, index });
  }

  rows.sort((left, right) => {
    const scoreOrder = rowScore(right) - rowScore(left);
    if (scoreOrder !== 0) return scoreOrder;
    const idOrder = compareText(left.id, right.id);
    if (idOrder !== 0) return idOrder;
    return left.index - right.index;
  });

  return rows.slice(0, limit).map((row, index) => ({
    item: row.item,
    score: rowScore(row),
    rank: index + 1,
    boost: roundScore(row.boost),
  }));
}
