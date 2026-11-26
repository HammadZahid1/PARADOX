import { hashString } from '@/utils/id';

/**
 * Deterministic pseudo-random generator (Mulberry32).
 * Identical seeds always produce identical streams, which makes simulations reproducible.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = (Math.floor(Math.abs(seed)) || 1) >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    if (max < min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[this.int(0, items.length - 1)];
  }

  /** Create an independent stream derived from this seed and a label. */
  fork(label: string): SeededRandom {
    return new SeededRandom((this.state ^ hashString(label)) >>> 0);
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }

  reset(seed: number): void {
    this.state = (Math.floor(Math.abs(seed)) || 1) >>> 0;
  }
}
