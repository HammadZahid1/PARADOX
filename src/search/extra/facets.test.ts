import { describe, expect, it } from 'vitest';
import type { FacetDocument, FacetFilters } from './facets';
import { applyFacets, buildFacets, facetMatches, hasFacetFilters } from './facets';

const documents: readonly FacetDocument[] = [
  { id: '1', domain: ' Climate Science ', kind: 'Scenario', tags: [' climate ', 'model'] },
  { id: '2', domain: 'climate science', kind: 'scenario', tags: ['model', 'energy'] },
  { id: '3', domain: 'ÉNERGIE', kind: 'variable', tags: ['storage'] },
  null as unknown as FacetDocument,
];

describe('facets', () => {
  it('builds sorted normalized counts with per-document tag deduplication', () => {
    const counts = buildFacets(documents);
    expect(counts.domains).toEqual({ 'climate science': 2, énergie: 1 });
    expect(counts.kinds).toEqual({ scenario: 2, variable: 1 });
    expect(counts.tags).toEqual({ climate: 1, energy: 1, model: 2, storage: 1 });
  });

  it('applies domain and kind filters case-insensitively', () => {
    const filtered = applyFacets(documents, { domains: ['CLIMATE SCIENCE'], kinds: ['SCENARIO'] });
    expect(filtered.map((document) => document.id)).toEqual(['1', '2']);
    expect(applyFacets(documents, { domains: ['énergie'] }).map((document) => document.id)).toEqual(['3']);
  });

  it('supports all and any tag modes', () => {
    expect(applyFacets(documents, { tags: ['model', 'energy'], tagMode: 'all' }).map((document) => document.id)).toEqual([
      '2',
    ]);
    expect(applyFacets(documents, { tags: ['model', 'energy'] }).map((document) => document.id)).toEqual(['1', '2']);
  });

  it('returns a defensive copy for empty filters', () => {
    const result = applyFacets(documents, {});
    expect(result).toHaveLength(3);
    result.pop();
    expect(applyFacets(documents, {})).toHaveLength(3);
  });

  it('handles empty corpora', () => {
    expect(buildFacets([])).toEqual({ domains: {}, kinds: {}, tags: {} });
    expect(applyFacets([], { domains: ['climate'] })).toEqual([]);
  });

  it('ignores malformed documents and unusable filters', () => {
    expect(facetMatches(null as unknown as FacetDocument, {})).toBe(false);
    expect(applyFacets(documents, { domains: [null] } as unknown as FacetFilters)).toHaveLength(3);
    expect(hasFacetFilters({ tags: [] })).toBe(false);
    expect(hasFacetFilters(null)).toBe(false);
  });
});
