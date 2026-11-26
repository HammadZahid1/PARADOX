import type { WorldState } from '@/engine/types';
import {
  combine,
  success,
  type ValidationIssue,
  type ValidationResult,
} from '@/engine/validation/common';

export interface SerializableOptions {
  /** Treat undefined at these paths as an omitted optional field rather than invalid data. */
  allowUndefinedPath?: (path: string) => boolean;
}

/** Validate that a value can cross a state transition without losing data. */
export function validateSerializable(value: unknown, path = 'value', options: SerializableOptions = {}): ValidationResult {
  const issues: ValidationIssue[] = [];
  inspect(value, path, new Set<object>(), issues, options);
  return issues.length === 0 ? success() : { valid: false, issues };
}

/** Guard a next state (and optionally its predecessor) before committing it. */
export function guardStateTransition(next: WorldState, previous?: WorldState): ValidationResult {
  const options: SerializableOptions = { allowUndefinedPath: isOptionalStateField };
  const nextCheck = validateSerializable(next, 'state', options);
  if (previous === undefined) return nextCheck;
  return combine(nextCheck, validateSerializable(previous, 'previousState', options));
}

/** Optional fields declared by WorldState and its nested engine records. */
const OPTIONAL_STATE_PATHS: readonly RegExp[] = [
  /^(?:state|previousState)\.parentId$/,
  /^(?:state|previousState)\.activeEvents\[\d+\]\.(?:endsAt|remainingSteps|temporaryEffect|revertAtStep)$/,
  /^(?:state|previousState)\.activeEvents\[\d+\]\.temporaryEffect\.otherwise$/,
  /^(?:state|previousState)\.eventHistory\[\d+\]\.(?:probability|description)$/,
  /^(?:state|previousState)\.changes\[\d+\]\.reason$/,
];

function isOptionalStateField(path: string): boolean {
  return OPTIONAL_STATE_PATHS.some((pattern) => pattern.test(path));
}

function inspect(
  value: unknown,
  path: string,
  ancestors: ReadonlySet<object>,
  issues: ValidationIssue[],
  options: SerializableOptions,
): void {
  if (value === undefined) {
    if (options.allowUndefinedPath?.(path) !== true) {
      issues.push(issue(path, 'Undefined is not serializable'));
    }
    return;
  }
  if (typeof value === 'function') {
    issues.push(issue(path, 'Functions are not serializable'));
    return;
  }
  if (typeof value === 'symbol') {
    issues.push(issue(path, 'Symbols are not serializable'));
    return;
  }
  if (typeof value === 'bigint') {
    issues.push(issue(path, 'BigInt values are not serializable'));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (ancestors.has(value)) {
    issues.push(issue(path, 'Circular references are not serializable'));
    return;
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      inspect(value[index], `${path}[${index}]`, nextAncestors, issues, options);
    }
    return;
  }
  for (const key of Object.keys(value)) {
    inspect((value as Record<string, unknown>)[key], childPath(path, key), nextAncestors, issues, options);
  }
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message, severity: 'error' };
}

function childPath(path: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}
