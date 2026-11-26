import type { SeededRandom } from './rng';
import { clamp, mean } from '@/utils/math';

export function uniform(random: SeededRandom, min = 0, max = 1): number {
  return random.range(min, max);
}

/** Normal distribution via Box–Muller with a guarded zero-variance case. */
export function normal(random: SeededRandom, mu = 0, sigma = 1): number {
  if (sigma <= 0) return mu;
  let u = 0;
  let v = 0;
  while (u === 0) u = random.next();
  while (v === 0) v = random.next();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mu + z * sigma;
}

export function bernoulli(random: SeededRandom, probability: number): boolean {
  return random.chance(clamp(probability, 0, 1));
}

export interface WeightedOption<T> {
  value: T;
  weight: number;
}

export function weightedPick<T>(random: SeededRandom, options: readonly WeightedOption<T>[]): T | undefined {
  const valid = options.filter((option) => Number.isFinite(option.weight) && option.weight > 0);
  const total = valid.reduce((sum, option) => sum + option.weight, 0);
  if (total <= 0) return undefined;
  let target = random.next() * total;
  for (const option of valid) {
    target -= option.weight;
    if (target <= 0) return option.value;
  }
  return valid[valid.length - 1]?.value;
}

export function exponential(random: SeededRandom, lambda: number): number {
  if (lambda <= 0) return Number.POSITIVE_INFINITY;
  return -Math.log(Math.max(Number.EPSILON, 1 - random.next())) / lambda;
}

export function triangular(random: SeededRandom, min: number, max: number, mode: number): number {
  if (max <= min) return min;
  const u = random.next();
  const f = (mode - min) / (max - min);
  const c = Math.sqrt(u * f);
  return u < f ? min + (max - min) * c : max - (max - min) * Math.sqrt(u * (1 - f));
}

export function poisson(random: SeededRandom, lambda: number): number {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random.next();
  } while (product > limit && count < 10000);
  return count - 1;
}

export function empiricalMean(samples: readonly number[]): number {
  return mean(samples);
}
