/** Canonical JSON-like serialization with sorted keys and deterministic fallbacks. */

export function stableStringify(value: unknown): string {
  const active = new WeakSet<object>();

  const serialize = (current: unknown): string => {
    if (current === undefined) return 'undefined';
    if (current === null) return 'null';
    if (typeof current === 'string') return JSON.stringify(current);
    if (typeof current === 'number') return Number.isFinite(current) ? JSON.stringify(current) : 'null';
    if (typeof current === 'boolean') return current ? 'true' : 'false';
    if (typeof current === 'bigint') return JSON.stringify(current.toString());
    if (typeof current === 'symbol') return JSON.stringify(String(current));
    if (typeof current === 'function') return JSON.stringify('[function]');
    if (current instanceof Date) return JSON.stringify(current);

    if (active.has(current)) return JSON.stringify('[circular]');
    active.add(current);
    try {
      if (Array.isArray(current)) return `[${current.map(serialize).join(',')}]`;
      const object = current as Record<string, unknown>;
      const entries: string[] = [];
      for (const key of Object.keys(object).sort()) {
        const item = object[key];
        if (item === undefined) continue;
        entries.push(`${JSON.stringify(key)}:${serialize(item)}`);
      }
      return `{${entries.join(',')}}`;
    } finally {
      active.delete(current);
    }
  };

  return serialize(value);
}
