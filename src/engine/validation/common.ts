export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: IssueSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function success(): ValidationResult {
  return { valid: true, issues: [] };
}

export function failure(path: string, message: string, severity: IssueSeverity = 'error'): ValidationResult {
  return { valid: false, issues: [{ path, message, severity }] };
}

export function combine(...results: ValidationResult[]): ValidationResult {
  const issues = results.flatMap((result) => result.issues);
  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}

export function requireNumber(value: unknown, path: string): ValidationResult {
  return typeof value === 'number' && Number.isFinite(value)
    ? success()
    : failure(path, 'Expected a finite number');
}

export function requireProbability(value: unknown, path: string): ValidationResult {
  const check = requireNumber(value, path);
  if (!check.valid) return check;
  const probability = value as number;
  return probability >= 0 && probability <= 1
    ? success()
    : failure(path, 'Probability must be between 0 and 1');
}

export function requireString(value: unknown, path: string, allowEmpty = false): ValidationResult {
  if (typeof value !== 'string') return failure(path, 'Expected a string');
  return allowEmpty || value.trim().length > 0 ? success() : failure(path, 'String must not be empty');
}
