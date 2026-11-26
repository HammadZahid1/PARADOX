export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface HistogramOptions {
  binCount?: number;
  min?: number;
  max?: number;
  includeUpperEdge?: boolean;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundValue(value: number): number {
  return cleanZero(Math.round(value * 1e10) / 1e10);
}

export function computeHistogram(
  values: readonly number[],
  options: HistogramOptions = {},
): HistogramBin[] {
  const finite: number[] = [];
  let dataMin = Number.POSITIVE_INFINITY;
  let dataMax = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    const clean = cleanZero(value);
    finite.push(clean);
    if (clean < dataMin) dataMin = clean;
    if (clean > dataMax) dataMax = clean;
  }

  if (finite.length === 0) return [];

  const binCount = clampInteger(finiteOr(options.binCount, 10), 1, 1000);
  const requestedMin = finiteOr(options.min, dataMin);
  const requestedMax = finiteOr(options.max, dataMax);
  const min = Math.min(requestedMin, requestedMax);
  const max = Math.max(requestedMin, requestedMax);
  const span = max - min;
  if (!Number.isFinite(span)) return [];

  const includeUpperEdge = options.includeUpperEdge !== false;

  if (span === 0) {
    const count = includeUpperEdge
      ? finite.reduce((total, value) => (value === min ? total + 1 : total), 0)
      : 0;
    return [{ start: roundValue(min), end: roundValue(min), count }];
  }

  const bins: HistogramBin[] = [];
  for (let index = 0; index < binCount; index += 1) {
    bins.push({
      start: roundValue(min + (span * index) / binCount),
      end: roundValue(min + (span * (index + 1)) / binCount),
      count: 0,
    });
  }

  for (const value of finite) {
    if (value < min || value > max) continue;
    if (!includeUpperEdge && value === max) continue;
    const index = Math.min(binCount - 1, Math.floor(((value - min) / span) * binCount));
    const bin = bins[index];
    if (bin) bin.count += 1;
  }

  return bins;
}
