/** Drag-and-drop import classification without filesystem or DOM APIs. */

import { isPlainObject } from '@/utils/clone';
import { BATCH_CSV_COLUMNS, type BatchCsvColumn } from './csvBatch';
import { CSV_SERIES_HEADER, parseCsvRow } from './csvSeries';

export type ImportKind = 'scenario' | 'workspace' | 'snapshot' | 'bundle' | 'csv' | 'ndjson' | 'unknown';
export type DetectionSource = 'content' | 'filename' | 'none';

export interface DragDetection {
  readonly kind: ImportKind;
  readonly source: DetectionSource;
  readonly reason: string;
}

const FORMAT_KINDS: Readonly<Record<string, ImportKind>> = {
  'paradox-scenario': 'scenario',
  'paradox-workspace': 'workspace',
  'paradox-snapshot': 'snapshot',
};

const EXTENSION_KINDS: Readonly<Record<string, ImportKind>> = {
  csv: 'csv',
  ndjson: 'ndjson',
  jsonl: 'ndjson',
  zip: 'bundle',
  bundle: 'bundle',
};

function readObject(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text) as unknown;
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

function isCsvHeader(text: string): boolean {
  try {
    const fields = parseCsvRow(text);
    if (fields.length === CSV_SERIES_HEADER.length) {
      return CSV_SERIES_HEADER.every((column, index) => column === fields[index]);
    }
    return BATCH_CSV_COLUMNS.every((column: BatchCsvColumn) => fields.includes(column));
  } catch {
    return false;
  }
}

/** Classify text content by envelope, NDJSON structure, or CSV header. */
export function sniffImportContent(content: string): ImportKind {
  const text = content.replace(/^\uFEFF/, '').trim();
  if (text.length === 0) return 'unknown';

  const envelope = readObject(text);
  if (envelope !== null) {
    const format = envelope['format'];
    if (typeof format === 'string' && FORMAT_KINDS[format] !== undefined) {
      return FORMAT_KINDS[format] ?? 'unknown';
    }
    if (Array.isArray(envelope['entries']) && envelope['version'] !== undefined) {
      return 'bundle';
    }
  }

  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length > 1 && lines.every((line) => readObject(line) !== null)) {
    return 'ndjson';
  }
  if (isCsvHeader(lines[0] ?? '')) return 'csv';
  return 'unknown';
}

/** Classify a filename by extension; plain .json needs content sniffing. */
export function detectImportKindFromFilename(filename: string): ImportKind {
  const base = filename.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot < 0) return 'unknown';
  const extension = base.slice(dot + 1).toLowerCase();
  return EXTENSION_KINDS[extension] ?? 'unknown';
}

/** Prefer content sniffing, then fall back to the filename extension. */
export function detectImportKind(filename: string, content: string): DragDetection {
  const fromContent = sniffImportContent(content);
  if (fromContent !== 'unknown') {
    return { kind: fromContent, source: 'content', reason: 'Recognized from file content' };
  }
  const fromName = detectImportKindFromFilename(filename);
  if (fromName !== 'unknown') {
    return { kind: fromName, source: 'filename', reason: 'Recognized from file extension' };
  }
  return { kind: 'unknown', source: 'none', reason: 'Unrecognized content and extension' };
}
