import { describe, expect, it } from 'vitest';
import {
  CSV_SERIES_HEADER,
  formatCsvField,
  formatCsvRow,
  parseCsvRow,
  parseCsvSeries,
  serializeCsvSeries,
  splitCsvRows,
  type CsvSeries,
} from './csvSeries';

const series: CsvSeries = {
  variableId: 'var_1',
  key: 'Growth, rate "net"',
  points: [
    { step: 0, time: 0, value: 'plain' },
    { step: 1, time: 1.5, value: 'comma, quote " and\nnewline' },
  ],
};

describe('variable series CSV', () => {
  it('round-trips quoted fields, escaped quotes and embedded newlines', () => {
    const text = serializeCsvSeries(series);
    expect(text.startsWith('# variableId,var_1\n')).toBe(true);
    expect(text).toContain(`${CSV_SERIES_HEADER.join(',')}\n`);
    expect(text).toContain('"Growth, rate ""net"""');
    expect(parseCsvSeries(text)).toEqual({ kind: 'ok', value: series });
  });

  it('parses CRLF and BOM-prefixed input', () => {
    const text = `\uFEFF${serializeCsvSeries(series).replace(/\n/g, '\r\n')}`;
    expect(parseCsvSeries(text)).toEqual({
      kind: 'ok',
      value: {
        ...series,
        points: [series.points[0]!, { ...series.points[1]!, value: 'comma, quote " and\r\nnewline' }],
      },
    });
  });

  it('rejects a malformed or reordered header', () => {
    const result = parseCsvSeries('step,time,value\n0,0,x\n');
    expect(result.kind).toBe('err');
    if (result.kind === 'err') {
      expect(result.issues[0]?.field).toBe('header');
      expect(result.issues[0]?.line).toBe(1);
    }
  });

  it('reports row issues with line numbers and field names', () => {
    const text = 'variableId,key,step,time,value\nvar_1,key,not-a-number,0,x\nvar_2,key,1,1,y\nvar_1,key,2\n';
    const result = parseCsvSeries(text);
    expect(result.kind).toBe('err');
    if (result.kind === 'err') {
      expect(result.issues.map((issue) => issue.field)).toEqual([
        'step',
        'variableId',
        'row',
      ]);
      expect(result.issues.map((issue) => issue.line)).toEqual([2, 3, 4]);
    }
  });

  it('handles empty series and raw field helpers', () => {
    expect(parseCsvSeries(serializeCsvSeries({ ...series, points: [] }))).toEqual({
      kind: 'ok',
      value: { variableId: 'var_1', key: series.key, points: [] },
    });
    expect(formatCsvField('a,b')).toBe('"a,b"');
    expect(formatCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(parseCsvRow('a,"b,c","d""e"')).toEqual(['a', 'b,c', 'd"e']);
    expect(() => parseCsvRow('"unterminated')).toThrow(/Unterminated/);
    expect(formatCsvRow(['a', 'b,c'])).toBe('a,"b,c"');
    expect(splitCsvRows('a,"b\nc",d\n')).toEqual(['a,"b\nc",d']);
  });
});
