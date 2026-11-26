import { describe, expect, it } from 'vitest';
import {
  parseNdjsonEvents,
  serializeNdjsonEvents,
  type EventLogRow,
} from './ndjsonEvents';

const rows: readonly EventLogRow[] = [
  { step: 0, time: 0, eventId: 'e1', type: 'scheduled', message: 'started', severity: 'info' },
  { step: 4, time: 2, eventId: 'e2', type: 'manual', message: 'paused, "again"' },
];

describe('NDJSON event logs', () => {
  it('round-trips typed rows with stable key order', () => {
    const text = serializeNdjsonEvents(rows);
    expect(text.split('\n')[0]).toBe('{"step":0,"time":0,"eventId":"e1","type":"scheduled","message":"started","severity":"info"}');
    expect(parseNdjsonEvents(text)).toEqual({ rows, errors: [] });
  });

  it('keeps valid lines and reports per-line errors', () => {
    const text = [
      JSON.stringify(rows[0]),
      '{not json}',
      JSON.stringify({ step: 'x', time: 1, eventId: 'e3', type: 'manual', message: 'm' }),
      '[1,2]',
      JSON.stringify(rows[1]),
    ].join('\n');
    const result = parseNdjsonEvents(text);
    expect(result.rows).toEqual([rows[0], rows[1]]);
    expect(result.errors.map((error) => error.line)).toEqual([2, 3, 4]);
    expect(result.errors[0]?.message).toBe('Invalid JSON');
    expect(result.errors[1]?.message).toContain('step');
    expect(result.errors[2]?.message).toBe('Expected a JSON object');
  });

  it('ignores blank lines and accepts BOM with CRLF endings', () => {
    const text = `\uFEFF${serializeNdjsonEvents(rows).replace(/\n/g, '\r\n')}\r\n`;
    expect(parseNdjsonEvents(text).rows).toEqual(rows);
    expect(parseNdjsonEvents('\n \n').errors).toEqual([]);
  });

  it('rejects unknown severities and empty required strings', () => {
    const text = JSON.stringify({
      step: 1,
      time: 1,
      eventId: '',
      type: 'manual',
      message: 'm',
      severity: 'fatal',
    });
    const result = parseNdjsonEvents(text);
    expect(result.rows).toEqual([]);
    expect(result.errors[0]?.message).toContain('eventId');
    expect(result.errors[0]?.message).toContain('severity');
  });

  it('serializes no events as an empty document', () => {
    expect(serializeNdjsonEvents([])).toBe('');
  });
});
