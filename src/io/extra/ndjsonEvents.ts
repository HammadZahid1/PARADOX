/** NDJSON event log parsing that keeps valid rows and reports each bad line. */

import { isPlainObject } from '@/utils/clone';

export const EVENT_SEVERITIES = ['info', 'notice', 'warning', 'critical'] as const;
export type EventSeverity = (typeof EVENT_SEVERITIES)[number];

export interface EventLogRow {
  readonly step: number;
  readonly time: number;
  readonly eventId: string;
  readonly type: string;
  readonly message: string;
  readonly severity?: EventSeverity;
}

export interface NdjsonLineError {
  readonly line: number;
  readonly raw: string;
  readonly message: string;
}

export interface NdjsonParseResult {
  readonly rows: readonly EventLogRow[];
  readonly errors: readonly NdjsonLineError[];
}

function serializeEvent(row: EventLogRow): string {
  return JSON.stringify({
    step: row.step,
    time: row.time,
    eventId: row.eventId,
    type: row.type,
    message: row.message,
    ...(row.severity === undefined ? {} : { severity: row.severity }),
  });
}

export function serializeNdjsonEvents(rows: readonly EventLogRow[]): string {
  return rows.length === 0 ? '' : `${rows.map(serializeEvent).join('\n')}\n`;
}

function readNumber(
  value: unknown,
  field: string,
  errors: string[],
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${field} must be a finite number`);
    return null;
  }
  return value;
}

function readString(value: unknown, field: string, errors: string[]): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return null;
  }
  return value;
}

/** Parse NDJSON line by line; a bad line never discards the other rows. */
export function parseNdjsonEvents(text: string): NdjsonParseResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const rows: EventLogRow[] = [];
  const errors: NdjsonLineError[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = index + 1;
    const raw = lines[index] ?? '';
    if (raw.trim().length === 0) continue;

    let value: unknown;
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      errors.push({ line, raw, message: 'Invalid JSON' });
      continue;
    }
    if (!isPlainObject(value)) {
      errors.push({ line, raw, message: 'Expected a JSON object' });
      continue;
    }

    const problems: string[] = [];
    const step = readNumber(value['step'], 'step', problems);
    const time = readNumber(value['time'], 'time', problems);
    const eventId = readString(value['eventId'], 'eventId', problems);
    const type = readString(value['type'], 'type', problems);
    const message = readString(value['message'], 'message', problems);
    const severityValue = value['severity'];
    let severity: EventSeverity | undefined;
    if (severityValue !== undefined) {
      if (typeof severityValue === 'string' && EVENT_SEVERITIES.includes(severityValue as EventSeverity)) {
        severity = severityValue as EventSeverity;
      } else {
        problems.push('severity must be a known severity');
      }
    }

    if (problems.length > 0) {
      errors.push({ line, raw, message: problems.join('; ') });
      continue;
    }
    if (step === null || time === null || eventId === null || type === null || message === null) {
      errors.push({ line, raw, message: 'Incomplete event row' });
      continue;
    }
    rows.push({
      step,
      time,
      eventId,
      type,
      message,
      ...(severity === undefined ? {} : { severity }),
    });
  }

  return { rows, errors };
}
