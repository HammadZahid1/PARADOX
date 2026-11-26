/** CSV serialization for batch result rows with a fixed column order. */

import { formatCsvRow, parseCsvRow, splitCsvRows } from './csvSeries';

export const BATCH_CSV_COLUMNS = [
  'runId',
  'seed',
  'step',
  'variableKey',
  'value',
  'status',
  'message',
] as const;

export type BatchCsvColumn = (typeof BATCH_CSV_COLUMNS)[number];
export type BatchRowStatus = 'ok' | 'error';

export interface BatchResultRow {
  readonly runId: string;
  readonly seed: number;
  readonly step: number;
  readonly variableKey: string;
  readonly value: number;
  readonly status: BatchRowStatus;
  readonly message?: string;
}

export interface BatchCsvIssue {
  readonly line: number;
  readonly field: string;
  readonly message: string;
}

export type BatchCsvParseResult =
  | { readonly kind: 'ok'; readonly rows: readonly BatchResultRow[] }
  | { readonly kind: 'err'; readonly issues: readonly BatchCsvIssue[] };

const STATUSES: readonly BatchRowStatus[] = ['ok', 'error'];

function parseNumber(
  raw: string,
  field: string,
  line: number,
  issues: BatchCsvIssue[],
): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    issues.push({ line, field, message: `${field} must not be empty` });
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    issues.push({ line, field, message: `${field} must be a finite number` });
    return null;
  }
  return value;
}

export function serializeBatchCsv(rows: readonly BatchResultRow[]): string {
  const lines = [formatCsvRow(BATCH_CSV_COLUMNS)];
  for (const row of rows) {
    lines.push(
      formatCsvRow([
        row.runId,
        String(row.seed),
        String(row.step),
        row.variableKey,
        String(row.value),
        row.status,
        row.message ?? '',
      ]),
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Parse batch CSV, accepting any header order but requiring every canonical column. */
export function parseBatchCsv(text: string): BatchCsvParseResult {
  const rows = splitCsvRows(text);

  const issues: BatchCsvIssue[] = [];
  let header: string[] = [];
  try {
    header = parseCsvRow(rows[0] ?? '');
  } catch {
    return {
      kind: 'err',
      issues: [{ line: 1, field: 'header', message: 'Unterminated quoted field' }],
    };
  }

  const indexes = new Map<string, number>();
  for (let index = 0; index < header.length; index += 1) {
    const column = header[index] ?? '';
    if (indexes.has(column)) {
      issues.push({ line: 1, field: column, message: `Duplicate column ${column}` });
    } else {
      indexes.set(column, index);
    }
  }
  for (const column of BATCH_CSV_COLUMNS) {
    if (!indexes.has(column)) {
      issues.push({ line: 1, field: column, message: `Missing required column ${column}` });
    }
  }
  for (const column of header) {
    if (!BATCH_CSV_COLUMNS.includes(column as BatchCsvColumn)) {
      issues.push({ line: 1, field: column, message: `Unknown column ${column}` });
    }
  }
  if (issues.length > 0) return { kind: 'err', issues };

  const field = (fields: readonly string[], column: BatchCsvColumn): string =>
    fields[indexes.get(column) ?? -1] ?? '';
  const parsed: BatchResultRow[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const line = index + 1;
    const row = rows[index] ?? '';
    if (row.trim().length === 0) {
      issues.push({ line, field: 'row', message: 'Blank data rows are not allowed' });
      continue;
    }
    let fields: string[];
    try {
      fields = parseCsvRow(row);
    } catch {
      issues.push({ line, field: 'row', message: 'Unterminated quoted field' });
      continue;
    }
    if (fields.length !== header.length) {
      issues.push({
        line,
        field: 'row',
        message: `Expected ${header.length} fields, received ${fields.length}`,
      });
      continue;
    }

    const runId = field(fields, 'runId');
    const variableKey = field(fields, 'variableKey');
    const status = field(fields, 'status') as BatchRowStatus;
    if (runId.trim().length === 0) {
      issues.push({ line, field: 'runId', message: 'runId must not be empty' });
    }
    if (variableKey.trim().length === 0) {
      issues.push({ line, field: 'variableKey', message: 'variableKey must not be empty' });
    }
    if (!STATUSES.includes(status)) {
      issues.push({ line, field: 'status', message: 'status must be ok or error' });
    }
    const seed = parseNumber(field(fields, 'seed'), 'seed', line, issues);
    const step = parseNumber(field(fields, 'step'), 'step', line, issues);
    const value = parseNumber(field(fields, 'value'), 'value', line, issues);
    const message = field(fields, 'message');
    if (seed !== null && step !== null && value !== null) {
      parsed.push({
        runId,
        seed,
        step,
        variableKey,
        value,
        status,
        ...(message.length > 0 ? { message } : {}),
      });
    }
  }

  return issues.length > 0
    ? { kind: 'err', issues }
    : { kind: 'ok', rows: parsed };
}
