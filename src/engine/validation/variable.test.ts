import { describe, expect, it } from 'vitest';
import type { VariableDefinition } from '@/engine/types';
import { validateVariableDefinition, validateVariableSet, validateVariableValue } from './variable';

const base: VariableDefinition = { id: 'v1', key: 'growth', name: 'Growth', type: 'number', initial: 2, min: 0, max: 10 };

describe('variable validation', () => {
  it('validates variable definitions', () => {
    expect(validateVariableDefinition(base).valid).toBe(true);
    expect(validateVariableDefinition({ ...base, min: 10, max: 1 }).valid).toBe(false);
    expect(validateVariableDefinition({ ...base, type: 'derived' }).valid).toBe(false);
  });

  it('validates values against types and bounds', () => {
    expect(validateVariableValue(base, 5).valid).toBe(true);
    expect(validateVariableValue(base, 11).valid).toBe(false);
    expect(validateVariableValue({ ...base, constraints: { integer: true } }, 2.5).valid).toBe(false);
    expect(validateVariableValue({ ...base, type: 'boolean', initial: false }, false).valid).toBe(true);
    expect(validateVariableValue({ ...base, type: 'categorical', initial: 'a', constraints: { allowed: ['a', 'b'] } }, 'c').valid).toBe(false);
  });

  it('detects duplicate keys in variable sets', () => {
    expect(validateVariableSet([base, base], { v1: 3 }).valid).toBe(false);
  });
});
