import { describe, expect, it } from 'vitest';
import { evaluateExpression } from './expression';

const values = { supply: 100, demand: 80, growth: 0.05 };

describe('derived variable expressions', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(evaluateExpression('supply - demand', values)).toBe(20);
    expect(evaluateExpression('supply + demand * 2', values)).toBe(260);
    expect(evaluateExpression('(supply + demand) * 0.5', values)).toBe(90);
  });

  it('supports unary-style subtraction via zero literals', () => {
    expect(evaluateExpression('0 - supply / 4', values)).toBe(-25);
    expect(evaluateExpression('growth * supply', values)).toBe(5);
  });

  it('handles divide-by-zero safely and rejects malformed expressions', () => {
    expect(evaluateExpression('supply / 0', values)).toBe(0);
    expect(() => evaluateExpression('supply +', values)).toThrow();
    expect(() => evaluateExpression('unknown + 1', values)).toThrow();
    expect(() => evaluateExpression('(supply', values)).toThrow();
    expect(() => evaluateExpression('supply # 2', values)).toThrow();
  });
});
