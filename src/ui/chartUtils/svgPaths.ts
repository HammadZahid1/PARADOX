export interface SvgPoint {
  x: number;
  y: number;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampDigits(value: number): number {
  return Math.min(6, Math.max(0, Math.floor(finiteOr(value, 2))));
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function formatCoordinate(value: number, digits: number): string {
  const text = cleanZero(value).toFixed(digits);
  return text === `-${(0).toFixed(digits)}` ? (0).toFixed(digits) : text;
}

function cleanPoints(points: readonly SvgPoint[]): SvgPoint[] {
  const cleaned: SvgPoint[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    cleaned.push({ x: cleanZero(point.x), y: cleanZero(point.y) });
  }
  return cleaned;
}

export function buildLinePath(points: readonly SvgPoint[], precision = 2): string {
  const cleaned = cleanPoints(points);
  const first = cleaned[0];
  if (!first) return '';

  const digits = clampDigits(precision);
  let path = `M ${formatCoordinate(first.x, digits)} ${formatCoordinate(first.y, digits)}`;
  for (let index = 1; index < cleaned.length; index += 1) {
    const point = cleaned[index];
    if (!point) continue;
    path += ` L ${formatCoordinate(point.x, digits)} ${formatCoordinate(point.y, digits)}`;
  }
  return path;
}

export function buildAreaPath(
  points: readonly SvgPoint[],
  baseline: number,
  precision = 2,
): string {
  if (!Number.isFinite(baseline)) return '';
  const cleaned = cleanPoints(points);
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (!first || !last) return '';

  const digits = clampDigits(precision);
  const base = cleanZero(baseline);
  let path = `M ${formatCoordinate(first.x, digits)} ${formatCoordinate(first.y, digits)}`;
  for (let index = 1; index < cleaned.length; index += 1) {
    const point = cleaned[index];
    if (!point) continue;
    path += ` L ${formatCoordinate(point.x, digits)} ${formatCoordinate(point.y, digits)}`;
  }
  path += ` L ${formatCoordinate(last.x, digits)} ${formatCoordinate(base, digits)}`;
  path += ` L ${formatCoordinate(first.x, digits)} ${formatCoordinate(base, digits)} Z`;
  return path;
}
