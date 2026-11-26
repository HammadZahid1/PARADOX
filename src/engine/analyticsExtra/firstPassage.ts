/** The first sample that crosses a threshold. */
export interface Passage {
  index: number;
  value: number;
}

function firstCrossing(values: readonly number[], threshold: number, upward: boolean): Passage | null {
  if (!Number.isFinite(threshold)) return null;
  let previous: Passage | null = null;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (previous) {
      const crossed = upward
        ? previous.value <= threshold && value > threshold
        : previous.value >= threshold && value < threshold;
      if (crossed) return { index, value };
    }
    previous = { index, value };
  }
  return null;
}

/**
 * First index whose value moves from at-or-below to strictly above the
 * threshold. A crossing requires a preceding finite sample, so index 0 is
 * never reported. Returns null for empty/constant series or invalid thresholds.
 */
export function firstUpwardCrossing(values: readonly number[], threshold: number): Passage | null {
  return firstCrossing(values, threshold, true);
}

/**
 * First index whose value moves from at-or-above to strictly below the
 * threshold. A crossing requires a preceding finite sample, so index 0 is
 * never reported. Returns null for empty/constant series or invalid thresholds.
 */
export function firstDownwardCrossing(values: readonly number[], threshold: number): Passage | null {
  return firstCrossing(values, threshold, false);
}
