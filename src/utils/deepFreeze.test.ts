import { describe, expect, it } from 'vitest';
import { deepFreeze } from './deepFreeze';

describe('deepFreeze', () => {
  it('freezes nested plain objects and arrays in place', () => {
    const value = { settings: { enabled: true }, items: [{ id: 'a' }] };
    expect(deepFreeze(value)).toBe(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.settings)).toBe(true);
    expect(Object.isFrozen(value.items)).toBe(true);
    expect(Object.isFrozen(value.items[0])).toBe(true);
  });

  it('tolerates cycles and shared references', () => {
    const shared = { id: 'shared' };
    const value: Record<string, unknown> = { first: shared, second: shared };
    value.self = value;
    expect(deepFreeze(value)).toBe(value);
    expect(Object.isFrozen(shared)).toBe(true);
    expect(value.self).toBe(value);
  });

  it('leaves primitives and non-plain objects untouched', () => {
    const date = new Date();
    expect(deepFreeze(date)).toBe(date);
    expect(Object.isFrozen(date)).toBe(false);
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze(null)).toBeNull();
  });
});
