import { describe, expect, it } from 'vitest';
import type { ScoreDocument } from './scoring';
import { compareScores, normalizeScore, resolveFieldWeights, scoreCandidate, scoreFields } from './scoring';

const exact: ScoreDocument = {
  id: 'exact',
  title: 'Climate model',
  subtitle: 'Overview',
  keywords: 'general',
  tags: [],
  domain: 'science',
  kind: 'scenario',
};

const keywordOnly: ScoreDocument = {
  id: 'keyword',
  title: 'Overview',
  subtitle: 'Notes',
  keywords: 'climate model',
  tags: [],
  domain: 'science',
  kind: 'scenario',
};

describe('scoring', () => {
  it('ranks exact title matches above keyword-only matches', () => {
    expect(scoreCandidate(exact, 'climate model')).toBeGreaterThan(scoreCandidate(keywordOnly, 'climate model'));
  });

  it('combines prefix and fuzzy token signals', () => {
    expect(scoreCandidate({ title: 'climate' }, 'clim')).toBeGreaterThan(0);
    expect(scoreCandidate({ title: 'climate' }, 'clim')).toBeGreaterThan(scoreCandidate({ title: 'economy' }, 'clim'));
    expect(scoreCandidate({ title: 'climate' }, 'clim', { useFuzzy: false })).toBeGreaterThan(0);
  });

  it('respects field weight overrides', () => {
    const weights = { title: 0, subtitle: 1, keywords: 10, tags: 0, domain: 0, kind: 0 };
    expect(scoreCandidate(exact, 'climate model', { weights })).toBeLessThan(
      scoreCandidate(keywordOnly, 'climate model', { weights }),
    );
    expect(resolveFieldWeights({ weights: { title: 99 } }).title).toBe(99);
  });

  it('handles empty queries and malformed documents', () => {
    expect(scoreCandidate(exact, '')).toBe(0);
    expect(scoreCandidate(null as unknown as ScoreDocument, 'climate')).toBe(0);
    expect(scoreCandidate({ title: 42, tags: {}, keywords: {} } as unknown as ScoreDocument, 'climate')).toBe(0);
    expect(scoreCandidate(exact, null)).toBe(0);
  });

  it('produces stable bounded breakdowns', () => {
    const breakdown = scoreFields(exact, 'climate');
    expect(breakdown.total).toBeGreaterThan(0);
    expect(breakdown.total).toBeLessThanOrEqual(1);
    expect(scoreFields(exact, 'climate')).toEqual(breakdown);
    expect(compareScores(scoreFields(exact, 'climate'), scoreFields(keywordOnly, 'climate'))).toBeLessThan(0);
    expect(normalizeScore(2)).toBe(1);
    expect(normalizeScore(Number.NaN)).toBe(0);
  });
});
