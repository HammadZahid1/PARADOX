import type { EventRecord } from '@/engine/types';

/** Minimal row shape for callers that already track typed events by tick. */
export interface EventRateRow {
  type: string;
  tick: number;
}

export interface EventRate {
  type: string;
  count: number;
  /** Events of this type per 1000 ticks. */
  ratePer1000: number;
}

export interface EventRateSummary {
  /** Inclusive distance from the earliest to latest valid tick (at least 1). */
  tickSpan: number;
  totalEvents: number;
  /** Rates sorted by ascending type name. */
  rates: EventRate[];
}

export type EventRateInput = EventRecord | EventRateRow;

function normalize(input: EventRateInput): EventRateRow {
  if ('type' in input) {
    const type = typeof input.type === 'string' && input.type.length > 0 ? input.type : 'unknown';
    return { type, tick: Number.isFinite(input.tick) ? input.tick : 0 };
  }
  const type = typeof input.source === 'string' && input.source.length > 0 ? input.source : 'unknown';
  return { type, tick: Number.isFinite(input.step) ? input.step : 0 };
}

/**
 * Count events by type and compute rates per 1000 ticks. Typed EventRecords
 * contribute their `source` and `step`; simple rows contribute `type` and
 * `tick`. Non-finite ticks are treated as tick 0, missing type names as
 * 'unknown', and an all-at-one-tick series has a span of 1.
 */
export function computeEventRates(events: readonly EventRateInput[]): EventRateSummary {
  if (events.length === 0) return { tickSpan: 0, totalEvents: 0, rates: [] };

  const counts = new Map<string, number>();
  let minTick = Number.POSITIVE_INFINITY;
  let maxTick = Number.NEGATIVE_INFINITY;
  for (const event of events) {
    const row = normalize(event);
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
    if (row.tick < minTick) minTick = row.tick;
    if (row.tick > maxTick) maxTick = row.tick;
  }

  const tickSpan = Math.max(1, maxTick - minTick + 1);
  const rates: EventRate[] = [...counts.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([type, count]) => ({ type, count, ratePer1000: (count * 1000) / tickSpan }));
  return { tickSpan, totalEvents: events.length, rates };
}
