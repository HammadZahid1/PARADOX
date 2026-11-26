/** CSV parsing and serialization for variable time series. */

export const CSV_SERIES_HEADER = ['variableId', 'key', 'step', 'time', 'value'] as const;

export interface CsvSeriesPoint {
  readonly step: number;
  readonly time: number;
  readonly value: string;
}

export interface CsvSeries {
  readonly variableId: string;
  readonly key: string;
  readonly points: readonly CsvSeriesPoint[];
}

export interface CsvSeriesIssue {
  readonly line: number;
  readonly field: string;
  readonly message: string;
}

export type CsvSeriesParseResult =
  | { readonly kind: 'ok'; readonly value: CsvSeries }
  | { readonly kind: 'err'; readonly issues: readonly CsvSeriesIssue[] };

/** Quote a single field only when CSV syntax requires it. */
export function formatCsvField(field: string): string {
  return /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/** Parse one CSV row, including quoted fields with doubled quotes and embedded newlines. */
export function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;
  let index = 0;

  while (index < row.length) {
    const char = row[index] ?? '';
    if (quoted) {
      if (char === '"') {
        if (row[index + 1] === '"') {
          current += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      current += char;
      index += 1;
      continue;
    }
    if (char === '"' && current.length === 0) {
      quoted = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      fields.push(current);
      current = '';
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }

  if (quoted) throw new Error('Unterminated quoted field');
  fields.push(current);
  return fields;
}

export function formatCsvRow(fields: readonly string[]): string {
  return fields.map(formatCsvField).join(',');
}

/** Split CSV text into rows without splitting newlines inside quoted fields. */
export function splitCsvRows(text: string): string[] {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[] = [];
  let current = '';
  let quoted = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index] ?? '';
    if (char === '"') {
      current += char;
      if (quoted && source[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      index += 1;
      continue;
    }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      rows.push(current);
      current = '';
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }

  rows.push(current);
  if (rows[rows.length - 1] === '') rows.pop();
  return rows;
}

export function serializeCsvSeries(series: CsvSeries): string {
  const rows = [
    formatCsvRow(['# variableId', series.variableId]),
    formatCsvRow(['# key', series.key]),
    formatCsvRow(CSV_SERIES_HEADER),
  ];
  for (const point of series.points) {
    rows.push(
      formatCsvRow([
        series.variableId,
        series.key,
        String(point.step),
        String(point.time),
        point.value,
      ]),
    );
  }
  return `${rows.join('\n')}\n`;
}

function parseNumber(
  raw: string,
  field: string,
  line: number,
  issues: CsvSeriesIssue[],
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

function parseRowSafely(row: string): string[] | null {
  try {
    return parseCsvRow(row);
  } catch {
    return null;
  }
}

/** Parse a CSV series, validating metadata and header and collecting every row issue. */
export function parseCsvSeries(text: string): CsvSeriesParseResult {
  const rows = splitCsvRows(text);
  const issues: CsvSeriesIssue[] = [];
  let variableId: string | null = null;
  let key: string | null = null;
  let cursor = 0;

  while (cursor < rows.length && (rows[cursor] ?? '').startsWith('#')) {
    const line = cursor + 1;
    const fields = parseRowSafely((rows[cursor] ?? '').slice(1).trimStart());
    const name = fields?.[0] ?? '';
    if (fields === null || fields.length !== 2 || (name !== 'variableId' && name !== 'key')) {
      issues.push({ line, field: 'metadata', message: 'Invalid metadata line' });
    } else if (name === 'variableId') {
      variableId = fields[1] ?? '';
    } else {
      key = fields[1] ?? '';
    }
    cursor += 1;
  }

  const headerLine = cursor + 1;
  const header = parseRowSafely(rows[cursor] ?? '');
  if (
    header === null ||
    header.length !== CSV_SERIES_HEADER.length ||
    CSV_SERIES_HEADER.some((column, index) => column !== header[index])
  ) {
    issues.push({
      line: headerLine,
      field: 'header',
      message: `Header must be ${CSV_SERIES_HEADER.join(',')}`,
    });
    return { kind: 'err', issues };
  }

  const points: CsvSeriesPoint[] = [];
  for (let index = cursor + 1; index < rows.length; index += 1) {
    const line = index + 1;
    const row = rows[index] ?? '';
    if (row.trim().length === 0) {
      issues.push({ line, field: 'row', message: 'Blank data rows are not allowed' });
      continue;
    }
    const fields = parseRowSafely(row);
    if (fields === null) {
      issues.push({ line, field: 'row', message: 'Unterminated quoted field' });
      continue;
    }
    if (fields.length !== CSV_SERIES_HEADER.length) {
      issues.push({
        line,
        field: 'row',
        message: `Expected ${CSV_SERIES_HEADER.length} fields, received ${fields.length}`,
      });
      continue;
    }

    if (variableId === null) variableId = fields[0] ?? '';
    if (key === null) key = fields[1] ?? '';
    if ((fields[0] ?? '') !== variableId) {
      issues.push({ line, field: 'variableId', message: 'variableId does not match the metadata' });
    }
    if ((fields[1] ?? '') !== key) {
      issues.push({ line, field: 'key', message: 'key does not match the metadata' });
    }
    const step = parseNumber(fields[2] ?? '', 'step', line, issues);
    const time = parseNumber(fields[3] ?? '', 'time', line, issues);
    if (step !== null && time !== null) {
      points.push({ step, time, value: fields[4] ?? '' });
    }
  }

  const finalId = variableId ?? '';
  const finalKey = key ?? '';
  if (finalId.length === 0) {
    issues.push({ line: headerLine, field: 'variableId', message: 'variableId must not be empty' });
  }
  if (finalKey.length === 0) {
    issues.push({ line: headerLine, field: 'key', message: 'key must not be empty' });
  }

  return issues.length > 0
    ? { kind: 'err', issues }
    : { kind: 'ok', value: { variableId: finalId, key: finalKey, points } };
}
