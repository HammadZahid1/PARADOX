import { clamp, mean, safeDivide } from '@/utils/math';

/** One observed (step, value) pair. The fitted line is descriptive, not a causal model. */
export interface RegressionSample {
  readonly step: number;
  readonly value: number;
}

/** Ordinary least-squares description of value as a function of step. */
export interface LinearRegression {
  count: number;
  slope: number;
  intercept: number;
  /** Coefficient of determination in [0, 1]; measures fit quality, never causation. */
  r2: number;
}

const EMPTY_REGRESSION: LinearRegression = { count: 0, slope: 0, intercept: 0, r2: 0 };

/** Fit value ~ step by ordinary least squares, ignoring non-finite samples. */
export function fitLinearRegression(samples: readonly RegressionSample[]): LinearRegression {
  const points = samples.filter((sample) => Number.isFinite(sample.step) && Number.isFinite(sample.value));
  if (points.length === 0) return { ...EMPTY_REGRESSION };

  const meanStep = mean(points.map((sample) => sample.step));
  const meanValue = mean(points.map((sample) => sample.value));
  const stepVariation = points.reduce((sum, sample) => sum + (sample.step - meanStep) ** 2, 0);

  if (points.length < 2 || stepVariation === 0) {
    return { count: points.length, slope: 0, intercept: meanValue, r2: 0 };
  }

  const covariance = points.reduce(
    (sum, sample) => sum + (sample.step - meanStep) * (sample.value - meanValue),
    0,
  );
  const slope = safeDivide(covariance, stepVariation);
  const intercept = meanValue - slope * meanStep;
  const totalVariation = points.reduce((sum, sample) => sum + (sample.value - meanValue) ** 2, 0);
  const residualVariation = points.reduce(
    (sum, sample) => sum + (sample.value - (intercept + slope * sample.step)) ** 2,
    0,
  );
  // A constant value has no explained variance to compare against, so r2 is reported as 0.
  const r2 = totalVariation === 0 ? 0 : clamp(1 - safeDivide(residualVariation, totalVariation), 0, 1);

  return { count: points.length, slope, intercept, r2 };
}

/** Evaluate the fitted line at a step; extrapolation is descriptive only. */
export function predictLinearRegression(model: LinearRegression, step: number): number {
  if (!Number.isFinite(step)) return model.intercept;
  return model.intercept + model.slope * step;
}
