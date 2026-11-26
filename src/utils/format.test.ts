import { describe, expect, it } from 'vitest';
import { formatDelta, formatTime, formatValue, truncate } from './format';

describe('display formatting', () => {
  it('formats scalar values with optional units', () => {
    expect(formatValue(12.3456)).toBe('12.35');
    expect(formatValue(4, 'GW')).toBe('4 GW');
    expect(formatValue(true)).toBe('true');
    expect(formatValue('stable')).toBe('stable');
    expect(formatValue(undefined)).toBe('—');
  });

  it('formats deltas and times', () => {
    expect(formatDelta(2.5)).toBe('+2.50');
    expect(formatDelta(-2.5)).toBe('-2.50');
    expect(formatTime(3661)).toBe('01:01:01');
  });

  it('truncates long labels', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });
});
