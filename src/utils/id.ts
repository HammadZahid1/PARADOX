let counter = 0;

/** Stable, collision-resistant local identifiers. No network or crypto dependency. */
export function createId(prefix = 'px'): string {
  counter = (counter + 1) % 0xffffff;
  const time = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, '0');
  return `${prefix}_${time}${counter.toString(36).padStart(4, '0')}${random}`;
}

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Derive a reproducible integer seed from arbitrary text. */
export function seedFromText(text: string): number {
  return hashString(text) % 2147483647;
}
