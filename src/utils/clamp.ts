/** Clamping helpers with optional bounds and explicit validation errors. */

export interface VariableBounds {
  readonly min?: number;
  readonly max?: number;
}

export type ClampVariableResult =
  | { readonly valid: true; readonly value: number }
  | { readonly valid: false; readonly error: string };

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function clampVariable(value: number, bounds: VariableBounds = {}): ClampVariableResult {
  if (!Number.isFinite(value)) return { valid: false, error: 'Value must be a finite number' };
  const { min, max } = bounds;
  if (min !== undefined && !Number.isFinite(min)) return { valid: false, error: 'Minimum must be a finite number' };
  if (max !== undefined && !Number.isFinite(max)) return { valid: false, error: 'Maximum must be a finite number' };
  if (min !== undefined && max !== undefined && min > max) return { valid: false, error: 'Minimum cannot exceed maximum' };
  return { valid: true, value: clamp(value, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY) };
}

export function clampVariableOrThrow(value: number, bounds: VariableBounds = {}): number {
  const result = clampVariable(value, bounds);
  if (!result.valid) throw new Error(result.error);
  return result.value;
}
