/** Closed intervals over finite numbers used for range arithmetic. */

export interface Interval {
  readonly min: number;
  readonly max: number;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

export function interval(min: number, max: number): Interval {
  const low = finite(min, 'Minimum');
  const high = finite(max, 'Maximum');
  if (low > high) throw new Error('Interval minimum cannot exceed maximum');
  return { min: low, max: high };
}

function checked(value: Interval): Interval {
  return interval(value.min, value.max);
}

export function add(left: Interval, right: Interval): Interval {
  const a = checked(left);
  const b = checked(right);
  return interval(a.min + b.min, a.max + b.max);
}

export function subtract(left: Interval, right: Interval): Interval {
  const a = checked(left);
  const b = checked(right);
  return interval(a.min - b.max, a.max - b.min);
}

export function multiply(left: Interval, right: Interval): Interval {
  const a = checked(left);
  const b = checked(right);
  const products = [a.min * b.min, a.min * b.max, a.max * b.min, a.max * b.max];
  return interval(Math.min(...products), Math.max(...products));
}

export function intersect(left: Interval, right: Interval): Interval | null {
  const a = checked(left);
  const b = checked(right);
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return min <= max ? { min, max } : null;
}

export function contains(value: Interval, candidate: number): boolean {
  const range = checked(value);
  return candidate >= range.min && candidate <= range.max;
}

export function width(value: Interval): number {
  const range = checked(value);
  return range.max - range.min;
}
