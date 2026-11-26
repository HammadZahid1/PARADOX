import { isPlainObject } from '@/utils/clone';
import { combine, failure, success, type ValidationResult } from './common';

export interface ImportEnvelope {
  format: 'paradox-scenario' | 'paradox-world' | 'paradox-workspace' | 'paradox-snapshot';
  version: number;
  payload: unknown;
}

export function parseImportEnvelope(text: string): ImportEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isPlainObject(parsed) || typeof parsed.format !== 'string' || typeof parsed.version !== 'number' || !('payload' in parsed)) return null;
    return parsed as unknown as ImportEnvelope;
  } catch {
    return null;
  }
}

export function validateEnvelope(envelope: ImportEnvelope): ValidationResult {
  const formats: ImportEnvelope['format'][] = ['paradox-scenario', 'paradox-world', 'paradox-workspace', 'paradox-snapshot'];
  if (!formats.includes(envelope.format)) return failure('format', 'Unsupported PARADOX import format');
  if (envelope.version < 1 || envelope.version > 3) return failure('version', 'Unsupported data version');
  if (envelope.payload === null || envelope.payload === undefined) return failure('payload', 'Missing import payload');
  return success();
}

export function validateJsonText(text: string): ValidationResult {
  const envelope = parseImportEnvelope(text);
  if (!envelope) return failure('json', 'Invalid JSON or PARADOX envelope');
  return validateEnvelope(envelope);
}

export function validateReferenceIntegrity(ids: readonly string[], references: readonly string[]): ValidationResult {
  const known = new Set(ids);
  const results: ValidationResult[] = [];
  for (const reference of references) {
    results.push(known.has(reference) ? success() : failure('reference', `Unknown reference ${reference}`));
  }
  return combine(...results);
}
