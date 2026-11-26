import { describe, expect, it } from 'vitest';
import { combine, failure, requireNumber, requireProbability, requireString, success } from './common';

describe('validation primitives', () => {
  it('combines results and gives errors priority over warnings', () => {
    expect(combine(success(), success()).valid).toBe(true);
    const combined = combine(success(), failure('x', 'warning', 'warning'));
    expect(combined.valid).toBe(true);
    expect(combine(combined, failure('y', 'error')).valid).toBe(false);
  });

  it('validates numbers, probabilities and strings', () => {
    expect(requireNumber(1, 'x').valid).toBe(true);
    expect(requireNumber(Number.NaN, 'x').valid).toBe(false);
    expect(requireProbability(0.5, 'p').valid).toBe(true);
    expect(requireProbability(1.2, 'p').valid).toBe(false);
    expect(requireString('ok', 'name').valid).toBe(true);
    expect(requireString('', 'name').valid).toBe(false);
    expect(requireString('', 'name', true).valid).toBe(true);
  });
});
