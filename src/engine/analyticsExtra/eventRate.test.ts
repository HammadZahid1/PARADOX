import { describe, expect, it } from 'vitest';
import type { EventRecord } from '@/engine/types';
import { computeEventRates, type EventRateRow } from './eventRate';

function record(source: string, step: number): EventRecord {
  return {
    id: `record-${source}-${step}`,
    eventId: `event-${source}`,
    eventName: source,
    step,
    time: step,
    severity: 'info',
    source,
    affectedVariables: [],
  };
}

describe('computeEventRates', () => {
  it('computes counts and per-1000-tick rates from simple rows', () => {
    const rows: EventRateRow[] = [
      ...Array.from({ length: 5 }, (_, index) => ({ type: 'alpha', tick: index })),
      ...Array.from({ length: 15 }, (_, index) => ({ type: 'beta', tick: 5 + index })),
    ];
    expect(computeEventRates(rows)).toEqual({
      tickSpan: 20,
      totalEvents: 20,
      rates: [
        { type: 'alpha', count: 5, ratePer1000: 250 },
        { type: 'beta', count: 15, ratePer1000: 750 },
      ],
    });
  });

  it('accepts typed event records using source and step', () => {
    const summary = computeEventRates([record('scheduled', 0), record('manual', 9), record('manual', 9)]);
    expect(summary).toEqual({
      tickSpan: 10,
      totalEvents: 3,
      rates: [
        { type: 'manual', count: 2, ratePer1000: 200 },
        { type: 'scheduled', count: 1, ratePer1000: 100 },
      ],
    });
  });

  it('returns a neutral summary for no events', () => {
    expect(computeEventRates([])).toEqual({ tickSpan: 0, totalEvents: 0, rates: [] });
  });

  it('treats invalid ticks as tick 0 and missing types as unknown', () => {
    const summary = computeEventRates([
      { type: 'alpha', tick: Number.NaN },
      { type: 'alpha', tick: 0 },
      { type: '', tick: Number.POSITIVE_INFINITY },
      record('', Number.NEGATIVE_INFINITY),
    ]);
    expect(summary).toEqual({
      tickSpan: 1,
      totalEvents: 4,
      rates: [
        { type: 'alpha', count: 2, ratePer1000: 2000 },
        { type: 'unknown', count: 2, ratePer1000: 2000 },
      ],
    });
  });
});
