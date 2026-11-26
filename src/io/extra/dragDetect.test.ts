import { describe, expect, it } from 'vitest';
import { CSV_SERIES_HEADER } from './csvSeries';
import {
  detectImportKind,
  detectImportKindFromFilename,
  sniffImportContent,
} from './dragDetect';

describe('drag import detection', () => {
  it('sniffs PARADOX envelopes from content', () => {
    expect(sniffImportContent('{"format":"paradox-scenario","version":1,"payload":{}}')).toBe('scenario');
    expect(sniffImportContent('{"format":"paradox-workspace","version":1,"payload":{}}')).toBe('workspace');
    expect(sniffImportContent('{"format":"paradox-snapshot","version":1,"payload":{}}')).toBe('snapshot');
    expect(sniffImportContent('{"version":1,"entries":[]}')).toBe('bundle');
  });

  it('sniffs NDJSON and CSV content', () => {
    expect(sniffImportContent('{"step":0}\n{"step":1}\n')).toBe('ndjson');
    expect(sniffImportContent(`${CSV_SERIES_HEADER.join(',')}\nv,key,0,0,x\n`)).toBe('csv');
    expect(
      sniffImportContent('runId,seed,step,variableKey,value,status,message\nx,1,0,k,1,ok,\n'),
    ).toBe('csv');
  });

  it('falls back to the extension when content is not recognized', () => {
    expect(detectImportKind('bundle.zip', 'not parseable')).toEqual({
      kind: 'bundle',
      source: 'filename',
      reason: 'Recognized from file extension',
    });
    expect(detectImportKindFromFilename('D:\\tmp\\events.ndjson')).toBe('ndjson');
    expect(detectImportKindFromFilename('series.csv')).toBe('csv');
    expect(detectImportKind('notes.json', '{')).toMatchObject({ kind: 'unknown', source: 'none' });
    expect(detectImportKindFromFilename('README')).toBe('unknown');
  });

  it('prefers content over a conflicting filename', () => {
    const detection = detectImportKind(
      'data.csv',
      '{"format":"paradox-scenario","version":1,"payload":{}}',
    );
    expect(detection.kind).toBe('scenario');
    expect(detection.source).toBe('content');
  });

  it('handles empty content and malformed CSV headers', () => {
    expect(sniffImportContent('')).toBe('unknown');
    expect(sniffImportContent('"unterminated')).toBe('unknown');
    expect(sniffImportContent('[1,2,3]')).toBe('unknown');
  });
});
