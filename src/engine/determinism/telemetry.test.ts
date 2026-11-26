import { describe, expect, it } from 'vitest';
import {
  createTelemetry,
  deserializeTelemetry,
  mergeTelemetry,
  serializeTelemetry,
  type Telemetry,
} from './telemetry';

describe('engine telemetry', () => {
  it('counts every telemetry kind and sums the snapshot total', () => {
    const collector = createTelemetry();
    collector.record('ticks', 3).record('draws').record('changes', 2).record('events').record('snapshots');
    expect(collector.snapshot()).toEqual({ ticks: 3, draws: 1, changes: 2, events: 1, snapshots: 1, total: 8 });
  });

  it('merges counts immutably and keeps collector state independent', () => {
    const left: Telemetry = { ticks: 2, draws: 0, changes: 1, events: 0, snapshots: 0 };
    const right: Telemetry = { ticks: 1, draws: 3, changes: 0, events: 2, snapshots: 0 };
    const merged = mergeTelemetry(left, right);
    expect(merged.ticks).toBe(3);
    expect(merged.events).toBe(2);
    expect(left.ticks).toBe(2);

    const collector = createTelemetry(left).merge(right);
    expect(collector.snapshot().draws).toBe(3);
    expect(right.draws).toBe(3);
  });

  it('normalizes invalid and fractional amounts to non-negative integers', () => {
    const collector = createTelemetry({ ticks: -5, draws: 2.9 } as unknown as Partial<Telemetry>);
    collector.record('events', Number.NaN).record('changes', 1.7);
    expect(collector.snapshot()).toMatchObject({ ticks: 0, draws: 2, changes: 1, events: 0 });
  });

  it('serializes snapshots deterministically and round-trips them', () => {
    const collector = createTelemetry({ ticks: 4, snapshots: 1 });
    const serialized = collector.serialize();
    expect(serialized).toBe(serializeTelemetry(collector.snapshot()));
    expect(deserializeTelemetry(serialized)).toEqual({ ticks: 4, draws: 0, changes: 0, events: 0, snapshots: 1 });
    expect(() => deserializeTelemetry('[]')).toThrow(/object/);
  });

  it('resets all counters', () => {
    const collector = createTelemetry({ ticks: 4 });
    collector.reset();
    expect(collector.snapshot().total).toBe(0);
  });
});
