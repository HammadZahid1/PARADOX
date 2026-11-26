/** A detected outlier with its original position and signed modified z-score. */
export interface Outlier {
  index: number;
  value: number;
  /** 0.6745 * (value - median) / MAD. */
  score: number;
}

/** Linear-interpolation median of an already sorted series. */
function medianOf(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const middle = (sorted.length - 1) / 2;
  const low = sorted[Math.floor(middle)] ?? 0;
  const high = sorted[Math.ceil(middle)] ?? 0;
  return low + (high - low) * (middle - Math.floor(middle));
}

/**
 * Median-absolute-deviation outlier detection. Scores are signed modified
 * z-scores; an outlier is any finite sample whose absolute score exceeds the
 * threshold (default 3.5). Results are sorted by ascending original index.
 * Non-finite samples are ignored, and a zero MAD (constant or heavily repeated
 * series) yields no outliers because the scale estimate is undefined.
 */
export function detectOutliers(values: readonly number[], threshold = 3.5): Outlier[] {
  const entries: Outlier[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (typeof value === 'number' && Number.isFinite(value)) entries.push({ index, value, score: 0 });
  }
  if (entries.length === 0) return [];

  const sortedValues = entries.map((entry) => entry.value).sort((left, right) => left - right);
  const center = medianOf(sortedValues);
  const deviations = sortedValues.map((value) => Math.abs(value - center)).sort((left, right) => left - right);
  const mad = medianOf(deviations);
  if (mad === 0) return [];

  const cutoff = typeof threshold === 'number' && Number.isFinite(threshold) && threshold >= 0 ? threshold : 3.5;
  return entries
    .map((entry) => ({ ...entry, score: (0.6745 * (entry.value - center)) / mad }))
    .filter((entry) => Math.abs(entry.score) > cutoff)
    .sort((left, right) => left.index - right.index);
}
