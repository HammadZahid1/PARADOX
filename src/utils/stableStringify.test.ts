import { describe, expect, it } from 'vitest';
import { stableStringify } from './stableStringify';

describe('stableStringify', () => {
  it('sorts object keys deterministically at every depth', () => {
    expect(stableStringify({ b: 1, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":1}');
    expect(stableStringify({ b: 1, a: { c: 3, d: 4 } })).toBe(stableStringify({ a: { d: 4, c: 3 }, b: 1 }));
  });

  it('preserves array order and handles primitives', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
    expect(stableStringify('x')).toBe('"x"');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(undefined)).toBe('undefined');
    expect(stableStringify(Number.NaN)).toBe('null');
  });

  it('omits undefined object values and serializes dates', () => {
    expect(stableStringify({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(stableStringify(new Date('2024-01-02T03:04:05.000Z'))).toBe('"2024-01-02T03:04:05.000Z"');
  });

  it('reports circular references instead of throwing', () => {
    const value: Record<string, unknown> = { id: 'root' };
    value.self = value;
    expect(stableStringify(value)).toBe('{"id":"root","self":"[circular]"}');
  });
});
