import { mean, standardDeviation } from '@/utils/math';

export interface RollingWindowOptions {
  /** Number of trailing raw samples in a window (default: 3). */
  windowSize?: number;
  /** Minimum finite samples required before a window is emitted (default: 1). */
  minPeriods?: number;
}

export interface RollingWindow {
  /** Inclusive raw-series index of the first sample covered by the window. */
  start: number;
  /** Inclusive raw-series index of the last sample covered by the window. */
  end: number;
  /** Number of finite samples actually used for the statistics. */
  count: number;
  mean: number;
  min: number;
  max: number;
  /** Population standard deviation of the finite samples in the window. */
  std: number;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

/**
 * Trailing rolling statistics over a numeric series. Non-finite samples are
 * skipped inside each window; indices still refer to the original series.
 */
export function rollingWindowStatistics(values: readonly number[], options: RollingWindowOptions = {}): RollingWindow[] {
  const size = positiveInteger(options.windowSize, 3);
  const minPeriods = Math.min(size, positiveInteger(options.minPeriods, 1));
  const windows: RollingWindow[] = [];

  for (let end = 0; end < values.length; end += 1) {
    const start = Math.max(0, end - size + 1);
    const finite: number[] = [];
    for (let index = start; index <= end; index += 1) {
      const value = values[index];
      if (value !== undefined && Number.isFinite(value)) finite.push(value);
    }
    if (finite.length < minPeriods) continue;

    let min = finite[0] ?? 0;
    let max = min;
    for (const value of finite) {
      if (value < min) min = value;
      if (value > max) max = value;
    }

    windows.push({
      start,
      end,
      count: finite.length,
      mean: mean(finite),
      min,
      max,
      std: standardDeviation(finite),
    });
  }

  return windows;
}
