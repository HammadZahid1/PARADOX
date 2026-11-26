import { describe, expect, it } from 'vitest';
import type { FacetDocument } from './facets';
import * as extra from './index';

interface CorpusDocument extends FacetDocument {
  readonly id: string;
  readonly title: string;
  readonly keywords?: string;
}

const corpus: readonly CorpusDocument[] = [
  { id: 'a', title: 'Climate model', keywords: '', domain: 'science', kind: 'scenario', tags: ['climate'] },
  { id: 'b', title: 'Energy grid', keywords: 'climate impact', domain: 'energy', kind: 'scenario', tags: [] },
  { id: 'c', title: 'Climate variable', keywords: '', domain: 'science', kind: 'variable', tags: ['climate'] },
];

describe('search extra barrel', () => {
  it('re-exports the public helpers', () => {
    expect(typeof extra.tokenize).toBe('function');
    expect(typeof extra.fuzzyScore).toBe('function');
    expect(typeof extra.scoreCandidate).toBe('function');
    expect(typeof extra.buildFacets).toBe('function');
    expect(typeof extra.buildSnippet).toBe('function');
    expect(typeof extra.expandQuery).toBe('function');
    expect(typeof extra.recordCommand).toBe('function');
    expect(typeof extra.registerCommand).toBe('function');
    expect(typeof extra.recordQuery).toBe('function');
    expect(typeof extra.suggestQueries).toBe('function');
    expect(typeof extra.rankCandidates).toBe('function');
  });

  it('runs a deterministic scoring and ranking pipeline', () => {
    const scored = corpus.map((document) => ({ item: document, score: extra.scoreCandidate(document, 'climate') }));
    const options = { filters: { kinds: ['SCENARIO'] } };
    const ranked = extra.rankCandidates(scored, options);
    expect(ranked.map((result) => result.item.id)).toEqual(['a', 'b']);
    expect(extra.rankCandidates(scored, options)).toEqual(ranked);
  });

  it('does not mutate query or corpus inputs', () => {
    const query = ' Climate   MODEL ';
    const tags = ['climate'];
    const document = { id: 'a', title: 'Climate model', tags };
    extra.expandQuery(query);
    extra.scoreCandidate(document, query);
    extra.buildFacets([document]);
    expect(query).toBe(' Climate   MODEL ');
    expect(tags).toEqual(['climate']);
    expect(document.title).toBe('Climate model');
  });
});
