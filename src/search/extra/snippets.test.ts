import { describe, expect, it } from 'vitest';
import type { Snippet } from './snippets';
import { buildSnippet, renderSnippet } from './snippets';

describe('snippets', () => {
  it('builds exact ranges for a full query phrase', () => {
    expect(buildSnippet('Climate model for cities', 'climate model')).toEqual({
      text: 'climate model for cities',
      ranges: [{ start: 0, end: 13, kind: 'exact' }],
    });
  });

  it('falls back to deterministic token ranges', () => {
    expect(buildSnippet('Climate resilient cities', 'climate cities')).toEqual({
      text: 'climate resilient cities',
      ranges: [
        { start: 0, end: 7, kind: 'prefix' },
        { start: 18, end: 24, kind: 'prefix' },
      ],
    });
  });

  it('clips context with a fixed radius and range limit', () => {
    const snippet = buildSnippet('Alpha beta climate gamma', 'climate', { radius: 2, maxRanges: 1 });
    expect(snippet).toEqual({ text: 'a climate g', ranges: [{ start: 2, end: 9, kind: 'exact' }] });
  });

  it('renders highlight markers without changing source text', () => {
    expect(renderSnippet({ text: 'alpha beta', ranges: [{ start: 6, end: 10, kind: 'token' }] })).toBe(
      'alpha <mark>beta</mark>',
    );
    expect(renderSnippet(null as unknown as Snippet)).toBe('');
  });

  it('handles empty and malformed inputs', () => {
    expect(buildSnippet(null, 'climate')).toEqual({ text: '', ranges: [] });
    expect(buildSnippet('Climate', null)).toEqual({ text: 'climate', ranges: [] });
    expect(buildSnippet('ABC', 'ABC', { radius: 0 })).toEqual({
      text: 'abc',
      ranges: [{ start: 0, end: 3, kind: 'exact' }],
    });
  });
});
