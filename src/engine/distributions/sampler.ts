/** Shared contracts and sampling helpers for the distribution modules. */

/** Minimal RNG shape required by every sampler; `SeededRandom` satisfies it. */
export interface RandomSource {
  next(): number;
}

/** Common contract implemented by the distribution factories. */
export interface Distribution {
  readonly mean: number;
  readonly variance: number;
  /** Inclusive lower and upper support bounds; infinities are allowed. */
  readonly support: readonly [number, number];
  sample(rng: RandomSource): number;
}

export function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
}

export function requirePositive(value: number, label: string): void {
  requireFinite(value, label);
  if (value <= 0) throw new RangeError(`${label} must be positive`);
}

export function requireNonNegative(value: number, label: string): void {
  requireFinite(value, label);
  if (value < 0) throw new RangeError(`${label} must be non-negative`);
}

export function requireInteger(value: number, label: string): void {
  requireFinite(value, label);
  if (!Number.isInteger(value)) throw new RangeError(`${label} must be an integer`);
}

/** Convert an RNG draw into a strictly interior (0, 1) value. */
export function unitInterval(rng: RandomSource): number {
  const value = rng.next();
  if (!Number.isFinite(value)) return Number.EPSILON;
  if (value <= 0) return Number.EPSILON;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

/** Standard normal via Box–Muller using the injected RNG. */
export function standardNormal(rng: RandomSource): number {
  const u = unitInterval(rng);
  const v = unitInterval(rng);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Draw `count` samples into a new array. */
export function sampleMany(distribution: Distribution, rng: RandomSource, count: number): number[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  const total = Math.floor(count);
  const values: number[] = [];
  for (let i = 0; i < total; i += 1) values.push(distribution.sample(rng));
  return values;
}

/** Draw one sample per slot of an existing array, preserving its length. */
export function sampleInto(distribution: Distribution, rng: RandomSource, target: number[]): number[] {
  for (let i = 0; i < target.length; i += 1) target[i] = distribution.sample(rng);
  return target;
}
