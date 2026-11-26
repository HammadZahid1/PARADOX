import { describe, expect, it } from 'vitest';
import { fuzzyScore, isFuzzySubsequence, isSubsequence, levenshtein } from './fuzzy';

describe('fuzzy matching', () => {
  it('computes Levenshtein distance over code points', () => {
    expect(levenshtein('kitten', 'sitting', 3)).toBe(3);
    expect(levenshtein('cat', 'cut', 1)).toBe(1);
    expect(levenshtein('climate', 'climate')).toBe(0);
    expect(levenshtein('', 'abc', 3)).toBe(3);
  });

  it('bounds distance reporting for expensive mismatches', () => {
    expect(levenshtein('abcdef', 'xyz', 2)).toBe(3);
    expect(levenshtein('abc', null, 1)).toBe(2);
    expect(levenshtein(null, undefined)).toBe(0);
  });

  it('detects subsequences and single-edit fuzzy subsequences', () => {
    expect(isSubsequence('clm', 'climate')).toBe(true);
    expect(isSubsequence('cml', 'climate')).toBe(false);
    expect(isSubsequence('', 'climate')).toBe(true);
    expect(isFuzzySubsequence('climte', 'climate', 1)).toBe(true);
    expect(isFuzzySubsequence('cliamte', 'climate', 1)).toBe(false);
    expect(isFuzzySubsequence('cliamte', 'climate', 2)).toBe(true);
    expect(isFuzzySubsequence('abc', null)).toBe(false);
  });

  it('returns bounded scores ordered by match quality', () => {
    const exact = fuzzyScore('climate', 'climate');
    const typo = fuzzyScore('climat', 'climate');
    const subsequence = fuzzyScore('clm', 'climate');
    const unrelated = fuzzyScore('xyz', 'climate');
    expect(exact).toBe(1);
    expect(typo).toBeGreaterThan(subsequence);
    expect(subsequence).toBeGreaterThan(unrelated);
    for (const score of [exact, typo, subsequence, unrelated]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('normalizes case and rejects malformed inputs', () => {
    expect(fuzzyScore('ÉCOLE', 'école')).toBe(1);
    expect(fuzzyScore(42 as unknown as string, 'x')).toBe(0);
    expect(fuzzyScore('climate', null)).toBe(0);
    expect(fuzzyScore('cliamte', 'climate', { maxDistance: 0, includeSubsequence: false })).toBe(0);
  });
});
