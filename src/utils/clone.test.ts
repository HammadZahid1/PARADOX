import { describe, expect, it } from 'vitest';
import { deepClone, isPlainObject } from './clone';

describe('structured cloning', () => {
  it('creates independent nested copies', () => {
    const original = { variables: { a: 1 }, events: [{ id: 'x' }] };
    const copy = deepClone(original);
    copy.variables.a = 9;
    copy.events[0]!.id = 'y';
    expect(original.variables.a).toBe(1);
    expect(original.events[0]!.id).toBe('x');
  });

  it('detects plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
  });
});
