import { describe, expect, it } from 'vitest';
import { createId, hashString, seedFromText } from './id';

describe('local identifiers', () => {
  it('generates prefixed unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId('ev')));
    expect(ids.size).toBe(500);
    expect([...ids][0]).toMatch(/^ev_/);
  });

  it('hashes strings deterministically', () => {
    expect(hashString('paradox')).toBe(hashString('paradox'));
    expect(hashString('paradox')).not.toBe(hashString('PARADOX'));
  });

  it('derives reproducible seeds inside int32 range', () => {
    const seed = seedFromText('economic-collapse');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2147483647);
    expect(seed).toBe(seedFromText('economic-collapse'));
  });
});
