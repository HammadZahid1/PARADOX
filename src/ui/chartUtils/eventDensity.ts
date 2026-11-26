export interface EventDensityBin {
  start: number;
  end: number;
  count: number;
  density: number;
}

export type DensityNormalization = 'width' | 'count';

export interface EventDensityOptions {
  normalizeBy?: DensityNormalization;
  includeUpperEdge?: boolean;
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundValue(value: number): number {
  return cleanZero(Math.round(value * 1e10) / 1e10);
}

export function computeEventDensity(
  events: readonly number[],
  ticks: readonly number[],
  options: EventDensityOptions = {},
): EventDensityBin[] {
  const sortedTicks = ticks
    .filter((tick) => Number.isFinite(tick))
    .map(cleanZero)
    .sort((left, right) => left - right);
  const uniqueTicks: number[] = [];
  for (const tick of sortedTicks) {
    if (uniqueTicks.length === 0 || tick !== uniqueTicks[uniqueTicks.length - 1]) {
      uniqueTicks.push(tick);
    }
  }
  if (uniqueTicks.length < 2) return [];

  const bins: EventDensityBin[] = [];
  for (let index = 0; index < uniqueTicks.length - 1; index += 1) {
    const start = uniqueTicks[index];
    const end = uniqueTicks[index + 1];
    if (start === undefined || end === undefined || end <= start) continue;
    bins.push({ start, end, count: 0, density: 0 });
  }
  if (bins.length === 0) return [];

  const first = bins[0];
  const last = bins[bins.length - 1];
  if (!first || !last) return [];

  const includeUpperEdge = options.includeUpperEdge !== false;
  for (const event of events) {
    if (!Number.isFinite(event)) continue;
    const value = cleanZero(event);
    if (value < first.start || value > last.end) continue;
    if (!includeUpperEdge && value === last.end) continue;

    for (const bin of bins) {
      const isLast = bin === last;
      if (value >= bin.start && (value < bin.end || (isLast && value === bin.end))) {
        bin.count += 1;
        break;
      }
    }
  }

  const normalizeBy = options.normalizeBy === 'count' ? 'count' : 'width';
  const weights = bins.map((bin) => (
    normalizeBy === 'count'
      ? bin.count
      : bin.count / (bin.end - bin.start)
  ));
  let maximum = 0;
  for (const weight of weights) {
    if (weight > maximum) maximum = weight;
  }

  if (maximum > 0) {
    bins.forEach((bin, index) => {
      bin.density = roundValue((weights[index] ?? 0) / maximum);
    });
  }

  return bins;
}
