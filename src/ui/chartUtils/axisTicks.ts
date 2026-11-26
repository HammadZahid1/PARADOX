export interface AxisTick {
  value: number;
  label: string;
}

const NICE_STEPS = [1, 2, 2.5, 5, 10] as const;
const MAX_TICKS = 256;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(finiteOr(value, min))));
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundValue(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return cleanZero(Math.round(value * factor) / factor);
}

function decimalsForStep(step: number): number {
  const normalized = roundValue(step, 12);
  const text = normalized.toString();
  const exponent = text.match(/e-(\d+)/)?.[1];
  if (exponent !== undefined) {
    return clampInteger(Number(exponent) + 1, 0, 10);
  }
  const fraction = text.split('.')[1] ?? '';
  return clampInteger(fraction.length, 0, 10);
}

function formatLabel(value: number, decimals: number): string {
  const fixed = roundValue(value, decimals).toFixed(decimals);
  if (decimals === 0) return fixed;
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function generateAxisTicks(
  domain: readonly [number, number],
  targetCount = 5,
): AxisTick[] {
  const [first, second] = domain;
  if (!Number.isFinite(first) || !Number.isFinite(second)) return [];

  const min = Math.min(first, second);
  const max = Math.max(first, second);
  const span = max - min;
  if (!Number.isFinite(span)) return [];

  if (span === 0) {
    return [{ value: cleanZero(min), label: formatLabel(min, 2) }];
  }

  const count = clampInteger(targetCount, 2, 20);
  const rawStep = span / (count - 1);
  if (!Number.isFinite(rawStep) || rawStep <= 0) return [];

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  if (!Number.isFinite(magnitude) || magnitude <= 0) return [];

  const normalizedStep = rawStep / magnitude;
  if (!Number.isFinite(normalizedStep)) return [];

  const niceStep = NICE_STEPS.find((step) => step >= normalizedStep) ?? 10;
  const step = niceStep * magnitude;
  if (!Number.isFinite(step) || step <= 0) return [];

  const decimals = decimalsForStep(step);
  const tolerance = 10 ** -(decimals + 2);
  const start = Math.ceil(min / step) * step;
  const end = Math.floor(max / step) * step;
  const ticks: AxisTick[] = [];

  for (let index = 0; index < MAX_TICKS; index += 1) {
    const value = roundValue(start + index * step, decimals + 2);
    if (value > roundValue(end, decimals + 2) + tolerance) break;
    if (value < min - tolerance || value > max + tolerance) continue;
    ticks.push({ value, label: formatLabel(value, decimals) });
  }

  return ticks;
}
