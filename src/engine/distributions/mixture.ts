import { requireFinite, unitInterval, type Distribution, type RandomSource } from './sampler';

export interface MixtureComponent extends Distribution {
  readonly weight: number;
}

export interface MixtureMoments {
  mean: number;
  variance: number;
}

function validComponents(components: readonly MixtureComponent[]): MixtureComponent[] {
  return components.filter((component) => Number.isFinite(component.weight) && component.weight > 0);
}

function totalWeight(components: readonly MixtureComponent[]): number {
  return components.reduce((sum, component) => sum + component.weight, 0);
}

/** Weights of positive-weight components, normalized to sum to one. */
export function normalizedWeights(components: readonly MixtureComponent[]): number[] {
  const valid = validComponents(components);
  const total = totalWeight(valid);
  if (total <= 0) return [];
  return valid.map((component) => component.weight / total);
}

/** Mean and total variance (law of total variance) of the mixture. */
export function mixtureMoments(components: readonly MixtureComponent[]): MixtureMoments {
  const valid = validComponents(components);
  const total = totalWeight(valid);
  if (total <= 0) throw new RangeError('mixture needs at least one positive finite weight');
  for (const component of valid) {
    requireFinite(component.mean, 'component mean');
    requireFinite(component.variance, 'component variance');
  }

  const mean = valid.reduce((sum, component) => sum + (component.weight / total) * component.mean, 0);
  const variance = valid.reduce((sum, component) => {
    const weight = component.weight / total;
    const deviation = component.mean - mean;
    return sum + weight * (component.variance + deviation * deviation);
  }, 0);
  return { mean, variance };
}

/** Choose a component by weight, then draw from that component. */
export function mixtureSample(rng: RandomSource, components: readonly MixtureComponent[]): number {
  const valid = validComponents(components);
  const total = totalWeight(valid);
  const fallback = valid[valid.length - 1];
  if (total <= 0 || !fallback) throw new RangeError('mixture needs at least one positive finite weight');

  let target = unitInterval(rng) * total;
  for (const component of valid) {
    target -= component.weight;
    if (target <= 0) return component.sample(rng);
  }
  return fallback.sample(rng);
}

export function createMixture(components: readonly MixtureComponent[]): Distribution {
  const { mean, variance } = mixtureMoments(components);
  const valid = validComponents(components);
  let lower = Number.POSITIVE_INFINITY;
  let upper = Number.NEGATIVE_INFINITY;
  for (const component of valid) {
    lower = Math.min(lower, component.support[0]);
    upper = Math.max(upper, component.support[1]);
  }
  return { mean, variance, support: [lower, upper], sample: (rng) => mixtureSample(rng, components) };
}
