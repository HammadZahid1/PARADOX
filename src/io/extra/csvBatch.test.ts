import { describe, expect, it } from 'vitest';
import {
  BATCH_CSV_COLUMNS,
  parseBatchCsv,
  serializeBatchCsv,
  type BatchCsvColumn,
  type BatchResultRow,
} from './csvBatch';
import { formatCsvRow } from './csvSeries';

const rows: readonly BatchResultRow[] = [
  { runId: 'run 1', seed: 42, step: 0, variableKey: 'a,b', value: 1.25, status: 'ok' },
  {
    runId: 'run"2',
    seed: 7,
    step: 3,
    variableKey: 'key',
    value: -2,
    status: 'error',
    message: 'line one\nline "two"',
  },
];

describe('batch result CSV', () => {
  it('uses a deterministic column order independent of object key order', () => {
    const text = serializeBatchCsv(rows);
    expect(text.split('\n')[0]).toBe(BATCH_CSV_COLUMNS.join(','));
    expect(serializeBatchCsv([rows[0]!])).toBe(`${text.split('\n').slice(0, 2).join('\n')}\n`);
  });

  it('round-trips escaped messages and optional fields', () => {
    expect(parseBatchCsv(serializeBatchCsv(rows))).toEqual({ kind: 'ok', rows });
  });

  it('accepts a reordered header by column name', () => {
    const values: Record<BatchCsvColumn, string> = {
      runId: 'run 1',
      seed: '42',
      step: '0',
      variableKey: 'a,b',
      value: '1.25',
      status: 'ok',
      message: '',
    };
    const header = BATCH_CSV_COLUMNS.slice().reverse();
    const reordered = `${formatCsvRow(header)}\n${formatCsvRow(header.map((column) => values[column]))}\n`;
    const result = parseBatchCsv(reordered);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.rows[0]).toEqual(rows[0]);
  });

  it('rejects missing, duplicate and unknown columns', () => {
    const missing = parseBatchCsv('runId,seed\nx,1\n');
    expect(missing.kind).toBe('err');
    if (missing.kind === 'err') {
      expect(missing.issues.some((issue) => issue.field === 'value')).toBe(true);
    }
    const unknown = parseBatchCsv(`${[...BATCH_CSV_COLUMNS, 'extra'].join(',')}\n`);
    expect(unknown.kind).toBe('err');
    if (unknown.kind === 'err') {
      expect(unknown.issues[0]?.field).toBe('extra');
    }
  });

  it('reports malformed numeric values and statuses', () => {
    const text = `${BATCH_CSV_COLUMNS.join(',')}\nx,NaN,0,k,1,ok,\n`;
    const result = parseBatchCsv(text);
    expect(result.kind).toBe('err');
    if (result.kind === 'err') {
      expect(result.issues.map((issue) => issue.field)).toContain('seed');
    }
    const statusText = `${BATCH_CSV_COLUMNS.join(',')}\nx,1,0,k,1,maybe,\n`;
    const statusResult = parseBatchCsv(statusText);
    expect(statusResult.kind).toBe('err');
    if (statusResult.kind === 'err') {
      expect(statusResult.issues[0]?.field).toBe('status');
    }
  });
});
