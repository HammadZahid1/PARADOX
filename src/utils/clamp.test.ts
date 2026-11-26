import { describe, expect, it } from 'vitest';
import { clamp, clampVariable, clampVariableOrThrow } from './clamp';

describe('clamping helpers', () => {
  it('clamps numeric values', () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-4, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(Number.NaN, 0, 10)).toBe(0);
  });

  it('honours optional bounds', () => {
    expect(clampVariable(12, {})).toEqual({ valid: true, value: 12 });
    expect(clampVariable(-3, { min: 0 })).toEqual({ valid: true, value: 0 });
    expect(clampVariable(30, { max: 20 })).toEqual({ valid: true, value: 20 });
    expect(clampVariable(15, { min: 0, max: 10 })).toEqual({ valid: true, value: 10 });
  });

  it('reports invalid values and bounds', () => {
    expect(clampVariable(Number.NaN)).toEqual({ valid: false, error: 'Value must be a finite number' });
    expect(clampVariable(1, { min: Number.POSITIVE_INFINITY })).toEqual({ valid: false, error: 'Minimum must be a finite number' });
    expect(clampVariable(1, { max: Number.NaN })).toEqual({ valid: false, error: 'Maximum must be a finite number' });
    expect(clampVariable(1, { min: 10, max: 5 })).toEqual({ valid: false, error: 'Minimum cannot exceed maximum' });
  });

  it('throws an explicit error in strict mode', () => {
    expect(clampVariableOrThrow(8, { min: 0, max: 5 })).toBe(5);
    expect(() => clampVariableOrThrow(1, { min: 10, max: 5 })).toThrow('Minimum cannot exceed maximum');
  });
});
