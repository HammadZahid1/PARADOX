/** A normalized correlation coefficient at a single lag. */
export interface CrossCorrelationPair {
  lag: number;
  value: number;
}

function finiteSamples(values: readonly number[]): number[] {
  const samples: number[] = [];
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) samples.push(value);
  }
  return samples;
}

/** Pearson correlation of overlapping segments, centered on their own means. */
function correlationAtLag(left: readonly number[], right: readonly number[], lag: number): number {
  const start = Math.max(0, -lag);
  const end = Math.min(left.length, right.length - lag);
  let count = 0;
  let sumLeft = 0;
  let sumRight = 0;
  for (let index = start; index < end; index += 1) {
    sumLeft += left[index] ?? 0;
    sumRight += right[index + lag] ?? 0;
    count += 1;
  }
  if (count < 2) return 0;

  const meanLeft = sumLeft / count;
  const meanRight = sumRight / count;
  let covariance = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = start; index < end; index += 1) {
    const leftDeviation = (left[index] ?? 0) - meanLeft;
    const rightDeviation = (right[index + lag] ?? 0) - meanRight;
    covariance += leftDeviation * rightDeviation;
    leftSquares += leftDeviation ** 2;
    rightSquares += rightDeviation ** 2;
  }
  if (leftSquares === 0 || rightSquares === 0) return 0;
  return covariance / Math.sqrt(leftSquares * rightSquares);
}

/**
 * Normalized cross-correlation for every lag in [-maxLag, maxLag], sorted by
 * ascending lag. Positive lag pairs left[i] with right[i + lag]. Overlapping
 * segments are mean-centered independently; degenerate overlaps yield 0.
 * Non-finite samples are ignored and invalid maxLag values are treated as 0.
 */
export function crossCorrelation(
  left: readonly number[],
  right: readonly number[],
  maxLag: number,
): CrossCorrelationPair[] {
  const first = finiteSamples(left);
  const second = finiteSamples(right);
  if (first.length === 0 || second.length === 0) return [];

  const requested = Number.isFinite(maxLag) ? Math.floor(maxLag) : 0;
  const limit = Math.max(0, Math.min(requested, Math.max(first.length, second.length) - 1));
  const pairs: CrossCorrelationPair[] = [];
  const firstLag = limit === 0 ? 0 : -limit;
  for (let lag = firstLag; lag <= limit; lag += 1) {
    pairs.push({ lag, value: correlationAtLag(first, second, lag) });
  }
  return pairs;
}
