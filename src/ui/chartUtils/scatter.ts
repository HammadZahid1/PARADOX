export interface ScatterPoint {
  x: number;
  y: number;
}

export type CovarianceMode = 'population' | 'sample';

export interface RegressionLine {
  slope: number;
  intercept: number;
  rSquared: number;
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function cleanPoints(points: readonly ScatterPoint[]): ScatterPoint[] {
  const cleaned: ScatterPoint[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    cleaned.push({ x: cleanZero(point.x), y: cleanZero(point.y) });
  }
  return cleaned;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function computeCovariance(
  points: readonly ScatterPoint[],
  mode: CovarianceMode = 'population',
): number {
  const cleaned = cleanPoints(points);
  if (cleaned.length < 2) return 0;

  const meanX = mean(cleaned.map((point) => point.x));
  const meanY = mean(cleaned.map((point) => point.y));
  const total = cleaned.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const denominator = mode === 'sample' ? cleaned.length - 1 : cleaned.length;
  return cleanZero(total / denominator);
}

export function computeCorrelation(points: readonly ScatterPoint[]): number {
  const cleaned = cleanPoints(points);
  if (cleaned.length < 2) return 0;

  const meanX = mean(cleaned.map((point) => point.x));
  const meanY = mean(cleaned.map((point) => point.y));
  let varianceX = 0;
  let varianceY = 0;
  let covariance = 0;

  for (const point of cleaned) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    varianceX += dx * dx;
    varianceY += dy * dy;
    covariance += dx * dy;
  }

  if (varianceX === 0 || varianceY === 0) return 0;
  const correlation = covariance / Math.sqrt(varianceX * varianceY);
  if (!Number.isFinite(correlation)) return 0;
  return cleanZero(Math.min(1, Math.max(-1, correlation)));
}

export function computeRegression(points: readonly ScatterPoint[]): RegressionLine {
  const cleaned = cleanPoints(points);
  if (cleaned.length === 0) return { slope: 0, intercept: 0, rSquared: 0 };

  const meanX = mean(cleaned.map((point) => point.x));
  const meanY = mean(cleaned.map((point) => point.y));
  let varianceX = 0;
  let covariance = 0;

  for (const point of cleaned) {
    const dx = point.x - meanX;
    varianceX += dx * dx;
    covariance += dx * (point.y - meanY);
  }

  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const correlation = computeCorrelation(cleaned);

  return {
    slope: cleanZero(slope),
    intercept: cleanZero(intercept),
    rSquared: cleanZero(correlation * correlation),
  };
}
