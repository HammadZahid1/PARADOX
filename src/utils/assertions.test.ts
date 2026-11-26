import { describe, expect, it } from 'vitest';
import { assertCondition, assertDefined, assertNever, narrow } from './assertions';

describe('assertions', () => {
  it('asserts defined values without rejecting falsy primitives', () => {
    expect(() => assertDefined(null)).toThrow('Expected value to be defined');
    expect(() => assertDefined(undefined, 'missing id')).toThrow('missing id');
    expect(() => assertDefined(0)).not.toThrow();
    expect(() => assertDefined(false)).not.toThrow();
    const value: string | undefined = 'ready';
    assertDefined(value);
    expect(value.toUpperCase()).toBe('READY');
  });

  it('narrows values with a type guard or throws', () => {
    const input: unknown = 'paradox';
    const text = narrow(input, (candidate): candidate is string => typeof candidate === 'string');
    expect(text.toUpperCase()).toBe('PARADOX');
    const numeric: unknown = 42;
    expect(() => narrow(numeric, (candidate): candidate is string => typeof candidate === 'string', 'expected text')).toThrow('expected text');
  });

  it('flags unreachable branches', () => {
    const exhaustive = (value: 'a' | 'b'): string => {
      if (value === 'a') return 'first';
      if (value === 'b') return 'second';
      return assertNever(value);
    };
    expect(exhaustive('a')).toBe('first');
    expect(() => assertNever('unexpected' as never)).toThrow('Unexpected value: unexpected');
    expect(() => assertNever('other' as never, 'custom')).toThrow('custom');
  });

  it('asserts conditions with custom errors', () => {
    expect(() => assertCondition(1 > 2)).toThrow('Assertion failed');
    expect(() => assertCondition(false, 'count must be positive')).toThrow('count must be positive');
    const maybe: number | undefined = 5;
    assertCondition(maybe !== undefined);
    expect(maybe + 1).toBe(6);
  });
});
