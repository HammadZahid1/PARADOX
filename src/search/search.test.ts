import { describe, expect, it } from 'vitest';
import { createAllPresets } from '@/engine/scenarios';
import { buildSearchIndex, searchDocuments } from './index';

const scenarios = createAllPresets().slice(0, 3);

describe('workspace search index', () => {
  it('indexes scenarios variables events rules and branches', () => {
    const documents = buildSearchIndex(scenarios, null);
    expect(documents.length).toBeGreaterThan(scenarios.length);
    expect(documents.some((item) => item.kind === 'variable')).toBe(true);
    expect(documents.some((item) => item.kind === 'event')).toBe(true);
  });

  it('ranks exact title matches above keyword matches', () => {
    const documents = buildSearchIndex(scenarios, null);
    const hits = searchDocuments(documents, scenarios[0]!.name);
    expect(hits[0]?.document.title).toBe(scenarios[0]!.name);
  });

  it('returns nothing for blank queries', () => {
    expect(searchDocuments(buildSearchIndex(scenarios, null), '   ')).toEqual([]);
  });
});
