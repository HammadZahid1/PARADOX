/** Recursively freeze plain objects and arrays without touching other object types. */

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

/** Freezes nested data in place, tolerating shared references and cycles. */
export function deepFreeze<T>(value: T): T {
  const seen = new WeakSet<object>();

  const freeze = (current: unknown): void => {
    if (typeof current !== 'object' || current === null || seen.has(current)) return;
    if (!Array.isArray(current) && !isPlainObject(current)) return;
    seen.add(current);
    for (const item of Object.values(current)) freeze(item);
    Object.freeze(current);
  };

  freeze(value);
  return value;
}
