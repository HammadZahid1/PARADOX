/** Sorting direction for a numeric table column. */
export type SortDirection = 'asc' | 'desc';

/** A result row with stable identity labels and numeric column values. */
export interface TableRow {
  id: string;
  name: string;
  values: Record<string, number>;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function columnValue(row: TableRow, column: string): number {
  const value = row.values[column];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Return a new array sorted by a numeric column. Missing or non-finite values
 * sort as 0. Ties break by ascending id, then name, then original position;
 * tie-breaking is unaffected by the sort direction.
 */
export function sortRowsByColumn(
  rows: readonly TableRow[],
  column: string,
  direction: SortDirection = 'asc',
): TableRow[] {
  const sign = direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = columnValue(left.row, column);
      const rightValue = columnValue(right.row, column);
      if (leftValue !== rightValue) return sign * (leftValue < rightValue ? -1 : 1);
      const byId = compareStrings(left.row.id, right.row.id);
      if (byId !== 0) return byId;
      const byName = compareStrings(left.row.name, right.row.name);
      if (byName !== 0) return byName;
      return left.index - right.index;
    })
    .map((entry) => entry.row);
}
