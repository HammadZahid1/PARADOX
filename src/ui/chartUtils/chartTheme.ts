export interface ChartColorTokens {
  background: string;
  grid: string;
  axis: string;
  text: string;
  muted: string;
  positive: string;
  negative: string;
  band: string;
  tooltipBackground: string;
  tooltipBorder: string;
  series: readonly string[];
}

export type ChartColorTokenName = keyof ChartColorTokens;

export const chartTheme: ChartColorTokens = Object.freeze({
  background: '#0d1117',
  grid: '#252d38',
  axis: '#7d8896',
  text: '#e6edf3',
  muted: '#7d8896',
  positive: '#34d399',
  negative: '#fb7185',
  band: 'rgba(61, 219, 217, 0.16)',
  tooltipBackground: '#111820',
  tooltipBorder: '#2b3543',
  series: Object.freeze([
    '#3ddbd9',
    '#3b82f6',
    '#a78bfa',
    '#f59e0b',
    '#34d399',
    '#f472b6',
    '#60a5fa',
    '#fb7185',
  ]),
});

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function hashKey(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function assignSeriesColors(
  keys: readonly string[],
  theme: ChartColorTokens = chartTheme,
): Record<string, string> {
  const palette = theme.series.length > 0 ? theme.series : chartTheme.series;
  const result: Record<string, string> = Object.create(null) as Record<string, string>;
  const used = new Set<string>();
  const uniqueKeys = Array.from(new Set(keys.map((key) => key.trim()).filter((key) => key !== '')))
    .sort(compareText);

  for (const key of uniqueKeys) {
    const start = hashKey(key) % palette.length;
    let chosen = palette[start] ?? chartTheme.series[0] ?? '#3ddbd9';

    for (let offset = 0; offset < palette.length; offset += 1) {
      const candidate = palette[(start + offset) % palette.length];
      if (candidate !== undefined && !used.has(candidate)) {
        chosen = candidate;
        break;
      }
    }

    used.add(chosen);
    result[key] = chosen;
  }

  return result;
}
