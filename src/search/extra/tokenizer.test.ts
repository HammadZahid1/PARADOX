import { describe, expect, it } from 'vitest';
import {
  compareText,
  isStopWord,
  normalizeQueryText,
  normalizeText,
  resolveInteger,
  roundScore,
  tokenize,
  tokenizeRaw,
  uniqueTokens,
} from './tokenizer';

describe('tokenizer', () => {
  it('lowercases Unicode text safely', () => {
    expect(tokenize('ÉCOLE Straße 東京 123')).toEqual(['école', 'straße', '東京', '123']);
    expect(normalizeText('ÉCOLE')).toBe('école');
    expect(normalizeText(null)).toBe('');
  });

  it('filters default stop words and supports explicit overrides', () => {
    expect(tokenize('The climate of a region')).toEqual(['climate', 'region']);
    expect(tokenize('alpha beta gamma', { stopWords: ['beta'] })).toEqual(['alpha', 'gamma']);
    expect(tokenize('The alpha', { keepStopWords: true })).toEqual(['the', 'alpha']);
    expect(isStopWord('the')).toBe(true);
    expect(isStopWord('climate')).toBe(false);
  });

  it('normalizes query text with collapsed whitespace', () => {
    expect(normalizeQueryText('  Café\tCAFÉ   Model ')).toBe('café café model');
    expect(normalizeQueryText(42)).toBe('');
  });

  it('deduplicates tokens without mutating or coercing malformed entries', () => {
    const source = ['Alpha', ' alpha ', 'ALPHA', 42, null];
    expect(uniqueTokens(source)).toEqual(['alpha']);
    expect(source).toEqual(['Alpha', ' alpha ', 'ALPHA', 42, null]);
    expect(tokenize(123 as unknown as string)).toEqual([]);
    expect(tokenizeRaw('the-alpha')).toEqual(['the', 'alpha']);
  });

  it('provides deterministic comparison and numeric helpers', () => {
    expect(compareText('alpha', 'beta')).toBe(-1);
    expect(compareText('beta', 'alpha')).toBe(1);
    expect(compareText('same', 'same')).toBe(0);
    expect(compareText(null, 'alpha')).toBe(-1);
    expect(roundScore(1.2345678, 3)).toBe(1.235);
    expect(roundScore(Number.NaN)).toBe(0);
    expect(resolveInteger('3', 2)).toBe(2);
    expect(resolveInteger(4, 2, 5)).toBe(5);
  });
});
