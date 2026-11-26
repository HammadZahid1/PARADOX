/** Structured clone with a JSON fallback for older browser contexts and tests. */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON cloning for non-cloneable objects.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
