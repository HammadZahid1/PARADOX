import { describe, expect, it } from 'vitest';
import { capitalize, slugify, stripControlChars, truncate, wordCount } from './text';

describe('text helpers', () => {
  it('creates url-safe slugs', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  Crème brûlée  ')).toBe('creme-brulee');
    expect(slugify('---')).toBe('');
  });

  it('truncates previews', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
    expect(truncate('abc', 0)).toBe('');
    expect(truncate('abcdef')).toBe('abcdef');
  });

  it('capitalizes and counts words', () => {
    expect(capitalize('pARADOX')).toBe('Paradox');
    expect(capitalize('')).toBe('');
    expect(wordCount('  one  two\nthree ')).toBe(3);
    expect(wordCount('   ')).toBe(0);
  });

  it('strips control characters but keeps line breaks and tabs', () => {
    expect(stripControlChars('a\u0000b\u001Fc\nd\te')).toBe('abc\nd\te');
    expect(stripControlChars('\u007f\u0085clean')).toBe('clean');
  });
});
