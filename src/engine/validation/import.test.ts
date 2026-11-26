import { describe, expect, it } from 'vitest';
import { parseImportEnvelope, validateEnvelope, validateJsonText, validateReferenceIntegrity } from './import';

describe('import validation', () => {
  const json = JSON.stringify({ format: 'paradox-scenario', version: 1, payload: { id: 's1' } });

  it('parses and validates envelopes', () => {
    expect(parseImportEnvelope(json)?.format).toBe('paradox-scenario');
    expect(validateJsonText(json).valid).toBe(true);
    expect(parseImportEnvelope('{oops')).toBeNull();
  });

  it('reports unsupported formats and versions', () => {
    expect(validateEnvelope({ format: 'unknown' as never, version: 1, payload: {} }).valid).toBe(false);
    expect(validateEnvelope({ format: 'paradox-world', version: 9, payload: {} }).valid).toBe(false);
    expect(validateEnvelope({ format: 'paradox-world', version: 1, payload: null }).valid).toBe(false);
  });

  it('checks references', () => {
    expect(validateReferenceIntegrity(['a', 'b'], ['a']).valid).toBe(true);
    expect(validateReferenceIntegrity(['a'], ['c']).valid).toBe(false);
  });
});
