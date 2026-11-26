/** Numeric helpers shared by simulation rules, analytics and visualizations. */

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function roundTo(value: number, decimals = 3): number {
  const factor = 10 ** Math.max(0, Math.floor(decimals));
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator === 0 || !Number.isFinite(denominator) ? fallback : numerator / denominator;
}

export function relativeDifference(left: number, right: number): number | null {
  const base = Math.abs(left);
  if (base < 1e-12) return Math.abs(right) < 1e-12 ? 0 : null;
  return (right - left) / base;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: readonly number[], sample = false): number {
  if (values.length < (sample ? 2 : 1)) return 0;
  const avg = mean(values);
  const denominator = values.length - (sample ? 1 : 0);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / denominator);
}

export function quantile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(p, 0, 1) * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low] ?? 0;
  return lerp(sorted[low] ?? 0, sorted[high] ?? 0, index - low);
}
