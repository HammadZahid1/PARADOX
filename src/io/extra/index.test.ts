import { describe, expect, it } from 'vitest';
import * as extra from './index';

const expectedFunctions = [
  'parseCsvSeries',
  'serializeCsvSeries',
  'formatCsvRow',
  'parseCsvRow',
  'splitCsvRows',
  'serializeBatchCsv',
  'parseBatchCsv',
  'parseNdjsonEvents',
  'serializeNdjsonEvents',
  'buildBundleManifest',
  'parseBundleManifest',
  'serializeBundleManifest',
  'verifyBundle',
  'verifyBundleText',
  'encodeScenarioSummary',
  'decodeScenarioSummary',
  'sanitizeScenarioFilename',
  'applyCollisionSuffix',
  'collectUnknownFieldWarnings',
  'detectImportKind',
  'negotiateImporterVersion',
  'renderReportMarkdown',
] as const;

describe('io extra barrel', () => {
  it('re-exports every public helper', () => {
    for (const name of expectedFunctions) {
      expect(typeof extra[name]).toBe('function');
    }
  });

  it('re-exports shared constants', () => {
    expect(extra.CSV_SERIES_HEADER).toEqual(['variableId', 'key', 'step', 'time', 'value']);
    expect(extra.BATCH_CSV_COLUMNS.length).toBe(7);
    expect(extra.BUNDLE_MANIFEST_VERSION).toBe(1);
    expect(extra.SHARE_LINK_PREFIX).toBe('p1.');
    expect(extra.LATEST_IMPORT_VERSION).toBe(2);
  });
});
