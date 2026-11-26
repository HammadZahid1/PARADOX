import { describe, expect, it } from 'vitest';
import { formatCompactNumber } from '@/ui/chartUtils/compactNumber';

describe('formatCompactNumber', () => {
  it('formats finite numbers with K, M, and B suffixes', () => {
    expect(formatCompactNumber(0)).toBe('0.0');
    expect(formatCompactNumber(999)).toBe('999.0');
    expect(formatCompactNumber(1000)).toBe('1.0K');
    expect(formatCompactNumber(1_234_567)).toBe('1.2M');
    expect(formatCompactNumber(2_000_000_000)).toBe('2.0B');
    expect(formatCompactNumber(1_500_000_000_000)).toBe('1500.0B');
  });

  it('honours fixed precision', () => {
    expect(formatCompactNumber(1234, 0)).toBe('1K');
    expect(formatCompactNumber(1234, 2)).toBe('1.23K');
    expect(formatCompactNumber(1, 3)).toBe('1.000');
  });

  it('normalizes negative zero and preserves negative values', () => {
    expect(formatCompactNumber(-0)).toBe('0.0');
    expect(formatCompactNumber(-1200)).toBe('-1.2K');
  });

  it('returns a placeholder for invalid numbers', () => {
    expect(formatCompactNumber(Number.NaN)).toBe('—');
    expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatCompactNumber(Number.NEGATIVE_INFINITY)).toBe('—');
  });

  it('falls back to a stable precision when precision is invalid', () => {
    expect(formatCompactNumber(1234, Number.NaN)).toBe('1.2K');
    expect(formatCompactNumber(1234, 1)).toBe(formatCompactNumber(1234, 1));
  });
});
