import { describe, expect, it } from 'vitest';
import { normalizeSeed, parseSeed } from './seed';

describe('seed parsing', () => {
  it('normalizes numeric seeds into uint32', () => {
    expect(normalizeSeed(42)).toBe(42);
    expect(normalizeSeed(-1)).toBe(4294967295);
    expect(normalizeSeed(2 ** 32 + 7)).toBe(7);
    expect(normalizeSeed(3.9)).toBe(3);
    expect(() => normalizeSeed(Number.NaN)).toThrow('Seed must be a finite number');
  });

  it('parses decimal and hex strings', () => {
    expect(parseSeed('42')).toBe(42);
    expect(parseSeed('-3')).toBe(4294967293);
    expect(parseSeed('0x10')).toBe(16);
    expect(parseSeed(' 21 ')).toBe(21);
  });

  it('hashes text deterministically', () => {
    const first = parseSeed('economic-collapse');
    expect(first).toBe(parseSeed('economic-collapse'));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(0xffffffff);
    expect(first).not.toBe(parseSeed('Economic-collapse'));
  });

  it('parses UUID-formatted seeds consistently', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(parseSeed(uuid)).toBe(parseSeed(uuid.toUpperCase()));
    expect(parseSeed(uuid)).toBeGreaterThanOrEqual(0);
    expect(parseSeed(uuid)).toBeLessThanOrEqual(0xffffffff);
    expect(parseSeed(uuid)).not.toBe(parseSeed('550e8400-e29b-41d4-a716-446655440001'));
  });
});
