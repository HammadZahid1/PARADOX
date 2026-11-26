import { describe, expect, it } from 'vitest';
import type { SynonymMap } from './synonyms';
import { buildSynonymMap, DEFAULT_SYNONYM_MAP, expandQuery, expandTokens, synonymsFor, SYNONYM_GROUPS } from './synonyms';

describe('synonyms', () => {
  it('expands known terms using explicit groups', () => {
    expect(expandQuery('automobile')).toEqual({ terms: ['automobile', 'car', 'vehicle'], added: ['car', 'vehicle'] });
    expect(expandQuery('AUTOMOBILE')).toEqual(expandQuery('automobile'));
  });

  it('never mutates tokens or reuses the input array', () => {
    const tokens = ['Automobile'];
    const expanded = expandTokens(tokens);
    expect(tokens).toEqual(['Automobile']);
    expect(expanded).not.toBe(tokens);
    expect(expanded).toEqual(['automobile', 'car', 'vehicle']);
  });

  it('keeps unknown terms and handles blank queries', () => {
    expect(expandQuery('unknown term')).toEqual({ terms: ['unknown', 'term'], added: [] });
    expect(expandQuery('   ')).toEqual({ terms: [], added: [] });
    expect(expandTokens(null as unknown as readonly string[])).toEqual([]);
  });

  it('supports custom groups and bounded expansion', () => {
    const options = { groups: [['fast', 'rapid', 'speedy']], maxExpansions: 2 };
    expect(expandQuery('fast quick', options)).toEqual({ terms: ['fast', 'rapid'], added: ['rapid'] });
    expect(SYNONYM_GROUPS.length).toBeGreaterThan(0);
    expect(buildSynonymMap([['solo']]).size).toBe(0);
  });

  it('normalizes lookup terms and rejects malformed maps', () => {
    expect(synonymsFor(' CAR ', DEFAULT_SYNONYM_MAP)).toEqual(['automobile', 'vehicle']);
    expect(synonymsFor('car', new Map() as SynonymMap)).toEqual([]);
    expect(synonymsFor(null, DEFAULT_SYNONYM_MAP)).toEqual([]);
  });
});
