import { describe, expect, it } from 'vitest';
import type { SuggestionCorpusEntry } from './suggestion';
import { completeToken, suggestQueries } from './suggestion';

const corpus: readonly SuggestionCorpusEntry[] = ['Climate model', 'Economy model', null as unknown as SuggestionCorpusEntry];

describe('suggestions', () => {
  it('ranks phrase prefix matches first', () => {
    const suggestions = suggestQueries(corpus, 'clim');
    expect(suggestions[0]?.text).toBe('climate model');
    expect(suggestions[0]?.score).toBe(1);
    expect(suggestions.map((suggestion) => suggestion.text)).toEqual(['climate model', 'climate']);
  });

  it('completes tokens after matched query tokens', () => {
    const suggestions = suggestQueries(['Notes about energy storage grid'], 'energy stor');
    expect(suggestions[0]?.text).toBe('energy storage');
    expect(suggestions[0]?.score).toBeGreaterThan(0);
  });

  it('breaks equal-score ties alphabetically', () => {
    expect(suggestQueries(['Alpha cloud', 'Zeta clown'], 'clo').map((suggestion) => suggestion.text)).toEqual([
      'cloud',
      'clown',
    ]);
  });

  it('returns no suggestions for empty corpora or empty queries', () => {
    expect(suggestQueries([], 'clim')).toEqual([]);
    expect(suggestQueries(corpus, '')).toEqual([]);
    expect(suggestQueries(corpus, 'the')).toEqual([]);
    expect(completeToken([], 'cli')).toEqual([]);
  });

  it('ignores malformed corpus entries', () => {
    const malformed = [null, 42, { title: 'Climate', subtitle: 5, keywords: null }] as unknown as readonly SuggestionCorpusEntry[];
    expect(suggestQueries(malformed, 'clim').map((suggestion) => suggestion.text)).toEqual(['climate']);
  });

  it('supports limits and standalone token completion', () => {
    expect(suggestQueries(['Climax', 'Climate', 'Cluster'], 'cli', { limit: 2 }).map((suggestion) => suggestion.text)).toEqual([
      'climate',
      'climax',
    ]);
    expect(completeToken(corpus, 'clim')).toEqual(['climate']);
    expect(completeToken(corpus, '')).toEqual([]);
  });
});
