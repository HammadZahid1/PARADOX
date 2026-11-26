export interface PercentileBandPoint {
  x: number;
  y: number;
}

export interface PercentileBand {
  low: number;
  high: number;
  points: readonly PercentileBandPoint[];
}

const DEFAULT_BANDS: readonly (readonly [number, number])[] = [
  [0.05, 0.95],
  [0.25, 0.75],
];

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundValue(value: number): number {
  return cleanZero(Math.round(value * 1e10) / 1e10);
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function percentile(sorted: readonly number[], fraction: number): number {
  const rank = fraction * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex] ?? sorted[0] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  return roundValue(lower + (upper - lower) * (rank - lowerIndex));
}

export function buildPercentileBands(
  samples: readonly (readonly number[])[],
  bands: readonly (readonly [number, number])[] = DEFAULT_BANDS,
): PercentileBand[] {
  const columns: Array<{ x: number; values: number[] }> = [];

  for (let x = 0; x < samples.length; x += 1) {
    const row = samples[x];
    if (!row) continue;
    const values = row.filter((value) => Number.isFinite(value)).map(cleanZero);
    if (values.length === 0) continue;
    values.sort((left, right) => left - right);
    columns.push({ x, values });
  }

  if (columns.length === 0) return [];

  const normalized: Array<{ low: number; high: number }> = [];
  for (const band of bands) {
    const [first, second] = band;
    if (!Number.isFinite(first) || !Number.isFinite(second)) continue;
    const low = clampUnit(Math.min(first, second));
    const high = clampUnit(Math.max(first, second));
    if (low > high) continue;
    normalized.push({ low, high });
  }

  normalized.sort((left, right) => left.low - right.low || left.high - right.high);

  return normalized.map(({ low, high }) => {
    const upper = columns.map(({ x, values }) => ({ x, y: percentile(values, high) }));
    const lower = columns
      .map(({ x, values }) => ({ x, y: percentile(values, low) }))
      .reverse();
    return { low, high, points: [...upper, ...lower] };
  });
}
