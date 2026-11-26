/** First-order and interaction variance shares estimated from a 2D score grid. */
export interface SobolApproximation {
  /** Variance share explained by row-dimension means. */
  firstOrderRow: number;
  /** Variance share explained by column-dimension means. */
  firstOrderColumn: number;
  /** Residual variance share after both first-order effects. */
  interaction: number;
  /** Total variance of the grid scores. */
  variance: number;
}

const EMPTY: SobolApproximation = {
  firstOrderRow: 0,
  firstOrderColumn: 0,
  interaction: 0,
  variance: 0,
};

/**
 * Approximate Sobol indices from a deterministic grid f(row, column). Row and
 * column means act as the two first-order effects, and the residual variance
 * is the interaction. Ragged rows are truncated to the shortest row length and
 * non-finite cells count as 0; empty or constant grids return all zeros.
 */
export function approximateSobolIndices(grid: readonly (readonly number[])[]): SobolApproximation {
  const rowCount = grid.length;
  const columnCount = rowCount === 0 ? 0 : Math.min(...grid.map((row) => row.length));
  if (rowCount === 0 || columnCount === 0) return { ...EMPTY };

  const cells: number[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const value = grid[row]?.[column];
      cells.push(typeof value === 'number' && Number.isFinite(value) ? value : 0);
    }
  }

  let total = 0;
  for (const value of cells) total += value;
  const mean = total / cells.length;

  let variance = 0;
  for (const value of cells) variance += (value - mean) ** 2;
  variance /= cells.length;
  if (variance === 0) return { ...EMPTY };

  let rowVariance = 0;
  for (let row = 0; row < rowCount; row += 1) {
    let sum = 0;
    for (let column = 0; column < columnCount; column += 1) sum += cells[row * columnCount + column] ?? 0;
    const rowMean = sum / columnCount;
    rowVariance += (rowMean - mean) ** 2 / rowCount;
  }

  let columnVariance = 0;
  for (let column = 0; column < columnCount; column += 1) {
    let sum = 0;
    for (let row = 0; row < rowCount; row += 1) sum += cells[row * columnCount + column] ?? 0;
    const columnMean = sum / rowCount;
    columnVariance += (columnMean - mean) ** 2 / columnCount;
  }

  return {
    firstOrderRow: rowVariance / variance,
    firstOrderColumn: columnVariance / variance,
    interaction: (variance - rowVariance - columnVariance) / variance,
    variance,
  };
}
