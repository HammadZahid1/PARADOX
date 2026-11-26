import { describe, expect, it } from 'vitest';
import { categoricalEntropy } from './entropy';

describe('categoricalEntropy', () => {
  it('returns exact bits for uniform and balanced categories', () => {
    expect(categoricalEntropy(['a', 'a', 'b', 'b'])).toBe(1);
    expect(categoricalEntropy(['a', 'b', 'c', 'd'])).toBe(2);
    expect(categoricalEntropy(['a', 'b'])).toBe(1);
  });

  it('matches the analytic entropy of a skewed distribution', () => {
    const expected = -(0.75 * Math.log2(0.75) + 0.25 * Math.log2(0.25));
    expect(categoricalEntropy(['x', 'x', 'x', 'y'])).toBeCloseTo(expected, 12);
  });

  it('returns zero for empty, single-element and constant series', () => {
    expect(categoricalEntropy([])).toBe(0);
    expect(categoricalEntropy(['only'])).toBe(0);
    expect(categoricalEntropy(['same', 'same', 'same'])).toBe(0);
  });

  it('is case-sensitive and counts the empty string as a category', () => {
    expect(categoricalEntropy(['a', 'A'])).toBe(1);
    expect(categoricalEntropy(['', ''])).toBe(0);
    expect(categoricalEntropy(['', 'a'])).toBe(1);
  });
});
