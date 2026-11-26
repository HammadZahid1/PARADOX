import { describe, expect, it } from 'vitest';
import type { FacetDocument } from './facets';
import { createRecentCommands, recordCommand } from './recentCommands';
import type { RankCandidate } from './rank';
import { rankCandidates } from './rank';

interface Item extends FacetDocument {
  readonly id: string;
  readonly title: string;
  readonly domain?: string;
  readonly kind?: string;
  readonly tags?: readonly string[];
}

function candidate(id: string, score: number, overrides: Partial<Item> = {}): RankCandidate<Item> {
  return { item: { id, title: id, ...overrides }, score };
}

const candidates: readonly RankCandidate<Item>[] = [
  candidate('low', 1),
  candidate('high', 9),
  candidate('mid', 5),
];

describe('ranking', () => {
  it('orders candidates by score with one-based ranks', () => {
    const ranked = rankCandidates(candidates);
    expect(ranked.map((result) => result.item.id)).toEqual(['high', 'mid', 'low']);
    expect(ranked.map((result) => result.rank)).toEqual([1, 2, 3]);
    expect(ranked[0]?.score).toBe(9);
  });

  it('breaks score ties by normalized id then input position', () => {
    expect(rankCandidates([candidate('beta', 5), candidate('alpha', 5), candidate('gamma', 5)]).map((row) => row.item.id)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    const duplicates = [candidate('same', 5, { title: 'first' }), candidate('same', 5, { title: 'second' })];
    expect(rankCandidates(duplicates).map((row) => row.item.title)).toEqual(['first', 'second']);
  });

  it('uses recent-command boosts deterministically', () => {
    const recent = recordCommand(createRecentCommands(), 'beta');
    const ranked = rankCandidates([candidate('alpha', 5), candidate('beta', 5)], { recent });
    expect(ranked.map((row) => row.item.id)).toEqual(['beta', 'alpha']);
    expect(ranked[0]?.boost).toBeGreaterThan(0);
    expect(ranked[1]?.boost).toBe(0);
  });

  it('applies optional facet filters before ranking', () => {
    const filtered = [
      candidate('a', 9, { domain: 'energy', kind: 'scenario', tags: ['climate', 'model'] }),
      candidate('b', 8, { domain: 'energy', kind: 'variable', tags: ['climate'] }),
      candidate('c', 7, { domain: 'health', kind: 'scenario', tags: ['model'] }),
    ];
    expect(
      rankCandidates(filtered, { filters: { domains: ['ENERGY'], tags: ['CLIMATE'], tagMode: 'all' } }).map(
        (row) => row.item.id,
      ),
    ).toEqual(['a', 'b']);
  });

  it('skips malformed candidates and empty corpora', () => {
    const malformed = [
      null,
      undefined,
      42,
      { score: 100 },
      { item: null, score: 100 },
      candidate('valid', 5),
    ] as unknown as readonly RankCandidate<Item>[];
    expect(rankCandidates(malformed).map((row) => row.item.id)).toEqual(['valid']);
    expect(rankCandidates([])).toEqual([]);
    expect(rankCandidates(candidates, { filters: { domains: ['missing'] } })).toEqual([]);
  });

  it('applies limits and clamps invalid scores', () => {
    expect(rankCandidates(candidates, { limit: 2 }).map((row) => row.item.id)).toEqual(['high', 'mid']);
    const invalid = [candidate('nan', Number.NaN), candidate('valid', 1)];
    expect(rankCandidates(invalid).map((row) => row.item.id)).toEqual(['valid', 'nan']);
  });
});
