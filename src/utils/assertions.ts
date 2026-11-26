/** Assertion helpers with descriptive errors and type-narrowing guarantees. */

export function assertDefined<T>(value: T | null | undefined, message = 'Expected value to be defined'): asserts value is T {
  if (value === null || value === undefined) throw new Error(message);
}

export function narrow<T, U extends T>(
  value: T,
  guard: (candidate: T) => candidate is U,
  message = 'Value did not satisfy the expected guard',
): U {
  if (!guard(value)) throw new Error(message);
  return value;
}

export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${String(value)}`);
}

export function assertCondition(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}
