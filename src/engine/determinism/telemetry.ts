import { stableStringify } from './checksum';

export type TelemetryKind = 'ticks' | 'draws' | 'changes' | 'events' | 'snapshots';
export type Telemetry = Record<TelemetryKind, number>;

export const TELEMETRY_KINDS: readonly TelemetryKind[] = ['ticks', 'draws', 'changes', 'events', 'snapshots'];

export interface TelemetrySnapshot extends Telemetry {
  readonly total: number;
}

export function emptyTelemetry(): Telemetry {
  return { ticks: 0, draws: 0, changes: 0, events: 0, snapshots: 0 };
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Pure addition of two telemetry records. */
export function mergeTelemetry(left: Telemetry, right: Partial<Telemetry>): Telemetry {
  const merged = emptyTelemetry();
  for (const kind of TELEMETRY_KINDS) {
    merged[kind] = normalizeCount(left[kind]) + normalizeCount(right[kind]);
  }
  return merged;
}

export function telemetrySnapshot(values: Telemetry): TelemetrySnapshot {
  const counts = mergeTelemetry(values, {});
  return { ...counts, total: TELEMETRY_KINDS.reduce((sum, kind) => sum + counts[kind], 0) };
}

export function serializeTelemetry(values: Telemetry): string {
  return stableStringify(telemetrySnapshot(values));
}

/** Decode a serialized snapshot; unknown or invalid counts are treated as zero. */
export function deserializeTelemetry(json: string): Telemetry {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Telemetry must be a serialized object');
  }
  const record = parsed as Record<string, unknown>;
  const decoded = emptyTelemetry();
  for (const kind of TELEMETRY_KINDS) decoded[kind] = normalizeCount(record[kind]);
  return decoded;
}

/** Mutable collector used by a running engine; snapshots and serialization are stable. */
export class TelemetryCollector {
  private counts: Telemetry = emptyTelemetry();

  record(kind: TelemetryKind, amount = 1): this {
    this.counts[kind] = normalizeCount(this.counts[kind]) + normalizeCount(amount);
    return this;
  }

  merge(other: Partial<Telemetry>): this {
    this.counts = mergeTelemetry(this.counts, other);
    return this;
  }

  snapshot(): TelemetrySnapshot {
    return telemetrySnapshot(this.counts);
  }

  serialize(): string {
    return serializeTelemetry(this.counts);
  }

  reset(): this {
    this.counts = emptyTelemetry();
    return this;
  }
}

export function createTelemetry(initial: Partial<Telemetry> = {}): TelemetryCollector {
  return new TelemetryCollector().merge(initial);
}
