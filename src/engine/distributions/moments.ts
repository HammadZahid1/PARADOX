import { requireFinite } from './sampler';

export interface Moments {
  count: number;
  mean: number;
  /** Population variance (m2 / count). */
  variance: number;
  /** Population skewness (m3 / variance^(3/2)); zero for degenerate samples. */
  skewness: number;
}

/** Welford-style online updates, extended with a third central moment. */
export class OnlineMoments {
  private count = 0;
  private currentMean = 0;
  private m2 = 0;
  private m3 = 0;

  get snapshot(): Moments {
    const variance = this.count > 0 ? this.m2 / this.count : 0;
    const skewness = variance > 0 && Number.isFinite(variance)
      ? this.m3 / (variance * Math.sqrt(variance))
      : 0;
    return { count: this.count, mean: this.currentMean, variance, skewness };
  }

  push(value: number): Moments {
    requireFinite(value, 'value');
    const n = this.count + 1;
    const delta = value - this.currentMean;
    this.currentMean += delta / n;
    const deltaFromNewMean = value - this.currentMean;
    const previousM2 = this.m2;
    this.m2 += delta * deltaFromNewMean;
    this.m3 += delta * delta * delta * (((n - 1) * (n - 2)) / (n * n)) - (3 * delta * previousM2) / n;
    this.count = n;
    return this.snapshot;
  }

  reset(): void {
    this.count = 0;
    this.currentMean = 0;
    this.m2 = 0;
    this.m3 = 0;
  }
}

export function computeMoments(values: readonly number[]): Moments {
  const tracker = new OnlineMoments();
  for (const value of values) tracker.push(value);
  return tracker.snapshot;
}
