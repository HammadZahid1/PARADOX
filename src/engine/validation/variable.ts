import type { ScalarValue, VariableDefinition } from '@/engine/types';
import { combine, failure, requireString, success, type ValidationResult } from './common';

export function validateVariableDefinition(definition: VariableDefinition): ValidationResult {
  const results = [
    requireString(definition.id, 'variable.id'),
    requireString(definition.key, 'variable.key'),
    requireString(definition.name, 'variable.name'),
  ];
  if (definition.min !== undefined && definition.max !== undefined && definition.min > definition.max) {
    results.push(failure('variable.max', 'Maximum must be greater than or equal to minimum'));
  }
  if (definition.type === 'derived' && (!definition.derivedFrom || definition.derivedFrom.length === 0)) {
    results.push(failure('variable.derivedFrom', 'Derived variables require source variables'));
  }
  if (definition.constraints?.allowed && definition.constraints.allowed.length === 0) {
    results.push(failure('variable.constraints.allowed', 'Allowed values must not be empty'));
  }
  return combine(...results);
}

export function validateVariableValue(definition: VariableDefinition, value: ScalarValue): ValidationResult {
  const expected = definition.type === 'number' || definition.type === 'derived' ? 'number'
    : definition.type === 'boolean' ? 'boolean'
      : definition.type === 'categorical' || definition.type === 'custom' ? 'string'
        : typeof value;
  if (typeof value !== expected) {
    return failure(`variables.${definition.key}`, `Expected ${expected} value`);
  }
  if (expected === 'number') {
    const numeric = value as number;
    const range = combine(
      definition.min !== undefined && numeric < definition.min
        ? failure(`variables.${definition.key}`, `Value below minimum ${definition.min}`)
        : success(),
      definition.max !== undefined && numeric > definition.max
        ? failure(`variables.${definition.key}`, `Value above maximum ${definition.max}`)
        : success(),
    );
    if (!range.valid) return range;
    if (definition.constraints?.integer && !Number.isInteger(numeric)) {
      return failure(`variables.${definition.key}`, 'Value must be an integer');
    }
  }
  if (typeof value === 'string' && definition.constraints?.allowed && !definition.constraints.allowed.includes(value)) {
    return failure(`variables.${definition.key}`, 'Value is not in the allowed set');
  }
  return success();
}

export function validateVariableSet(definitions: readonly VariableDefinition[], values: Record<string, ScalarValue>): ValidationResult {
  const seen = new Set<string>();
  const results: ValidationResult[] = [];
  for (const definition of definitions) {
    results.push(validateVariableDefinition(definition));
    if (seen.has(definition.key)) results.push(failure('variable.key', `Duplicate variable key: ${definition.key}`));
    seen.add(definition.key);
    results.push(validateVariableValue(definition, values[definition.id] ?? definition.initial));
  }
  return combine(...results);
}
