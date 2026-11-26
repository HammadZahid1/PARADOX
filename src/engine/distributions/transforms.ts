import { requireFinite, type Distribution } from './sampler';

export type ValueTransform = (value: number) => number;

export interface TransformOptions {
  mean?: number;
  variance?: number;
  support?: readonly [number, number];
}

/** Apply transforms left to right: composeTransforms(f, g)(x) === g(f(x)). */
export function composeTransforms(...transforms: readonly ValueTransform[]): ValueTransform {
  if (transforms.length === 0) return (value) => value;
  return (value) => transforms.reduce((current, transform) => transform(current), value);
}

/**
 * Wrap a distribution with a value transform. Exact moments can be supplied
 * via options; otherwise the source moments are carried over.
 */
export function applyTransform(
  distribution: Distribution,
  transform: ValueTransform,
  options: TransformOptions = {},
): Distribution {
  const mean = options.mean ?? distribution.mean;
  const variance = options.variance ?? distribution.variance;
  const support = options.support ?? distribution.support;
  requireFinite(mean, 'mean');
  requireFinite(variance, 'variance');
  if (variance < 0) throw new RangeError('variance must be non-negative');
  if (support[0] > support[1]) throw new RangeError('support lower bound must not exceed upper bound');
  return { mean, variance, support, sample: (rng) => transform(distribution.sample(rng)) };
}

export function scale(distribution: Distribution, factor: number): Distribution {
  requireFinite(factor, 'factor');
  const lower = distribution.support[0] * factor;
  const upper = distribution.support[1] * factor;
  return applyTransform(distribution, (value) => value * factor, {
    mean: distribution.mean * factor,
    variance: distribution.variance * factor * factor,
    support: [Math.min(lower, upper), Math.max(lower, upper)],
  });
}

export function shift(distribution: Distribution, offset: number): Distribution {
  requireFinite(offset, 'offset');
  return applyTransform(distribution, (value) => value + offset, {
    mean: distribution.mean + offset,
    variance: distribution.variance,
    support: [distribution.support[0] + offset, distribution.support[1] + offset],
  });
}

/** Clamp samples to [min, max]; variance is a conservative upper estimate. */
export function clamp(distribution: Distribution, min: number, max: number): Distribution {
  requireFinite(min, 'min');
  requireFinite(max, 'max');
  if (max < min) throw new RangeError('min must not exceed max');
  const width = max - min;
  return applyTransform(distribution, (value) => Math.min(max, Math.max(min, value)), {
    mean: Math.min(max, Math.max(min, distribution.mean)),
    variance: Math.min(distribution.variance, (width * width) / 4),
    support: [min, max],
  });
}

/** Absolute value; moments are conservative estimates for non-degenerate inputs. */
export function abs(distribution: Distribution): Distribution {
  const upper = Math.max(Math.abs(distribution.support[0]), Math.abs(distribution.support[1]));
  return applyTransform(distribution, (value) => Math.abs(value), {
    mean: Math.abs(distribution.mean),
    variance: distribution.variance,
    support: [0, upper],
  });
}
