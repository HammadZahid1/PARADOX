import { describe, expect, it } from 'vitest';
import {
  LATEST_IMPORT_VERSION,
  SUPPORTED_IMPORT_VERSIONS,
  explainUnsupportedVersion,
  negotiateImporterVersion,
} from './versionNegotiate';

describe('importer version negotiation', () => {
  it('accepts supported versions', () => {
    expect(LATEST_IMPORT_VERSION).toBe(2);
    expect(SUPPORTED_IMPORT_VERSIONS).toEqual([1, 2]);
    expect(negotiateImporterVersion(1)).toMatchObject({ supported: true, selected: 1 });
    expect(negotiateImporterVersion(2)).toEqual({
      supported: true,
      requested: 2,
      selected: 2,
      reason: 'Importer version 2 is supported',
    });
  });

  it('explains versions that are too new or too old', () => {
    expect(negotiateImporterVersion(9)).toMatchObject({
      supported: false,
      requested: 9,
      selected: null,
      reason: 'Version 9 is newer than the maximum supported version 2',
    });
    expect(negotiateImporterVersion(0).reason).toContain('minimum supported version 1');
    expect(explainUnsupportedVersion(9)).toContain('maximum supported version 2');
    expect(explainUnsupportedVersion(2)).toBe('');
  });

  it('selects a compatible fallback inside a version gap', () => {
    const result = negotiateImporterVersion(2, [3, 1, 1]);
    expect(result).toEqual({
      supported: false,
      requested: 2,
      selected: 1,
      reason: 'Version 2 is not supported; using compatible importer version 1',
    });
  });

  it('rejects non-integer requests and empty support lists', () => {
    for (const bad of ['2', 2.5, Number.NaN, null, undefined]) {
      expect(negotiateImporterVersion(bad)).toMatchObject({
        supported: false,
        requested: null,
        selected: null,
      });
    }
    expect(negotiateImporterVersion(1, []).reason).toBe('No importer versions are configured');
  });
});
