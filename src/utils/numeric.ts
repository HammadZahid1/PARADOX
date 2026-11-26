/** Finite-number guards and small interpolation helpers. */

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function areFiniteNumbers(values: readonly unknown[]): values is readonly number[] {
  return values.every(isFiniteNumber);
}

export function requireFinite(value: unknown, name = 'value'): number {
  if (!isFiniteNumber(value)) throw new Error(`${name} must be a finite number`);
  return value;
}

export function roundTo(value: number, decimals = 3): number {
  if (!Number.isFinite(value)) return value;
  const places = Number.isFinite(decimals) ? Math.max(0, Math.floor(decimals)) : 0;
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Linear interpolation; `t` is not clamped, so extrapolation is allowed. */
export function lerp(a: number, b: number, t: number): number {
  if (!areFiniteNumbers([a, b, t])) return Number.NaN;
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (!areFiniteNumbers([a, b, value]) || a === b) return Number.NaN;
  return (value - a) / (b - a);
}

export function approximatelyEqual(a: number, b: number, tolerance = 1e-9): boolean {
  if (!Number.isFinite(tolerance)) return a === b;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= Math.abs(tolerance);
}
