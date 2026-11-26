/** Deterministic conversion of numeric, text and UUID seeds into uint32 values. */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECIMAL_PATTERN = /^[+-]?\d+$/;
const HEX_PATTERN = /^0x[0-9a-f]+$/i;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error('Seed must be a finite number');
  return Math.trunc(seed) >>> 0;
}

function hashText(text: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), FNV_PRIME);
  }
  return hash >>> 0;
}

function hashUuid(uuid: string): number {
  const hex = uuid.replace(/-/g, '').toLowerCase();
  let hash = FNV_OFFSET;
  for (let i = 0; i < hex.length; i += 2) {
    hash = Math.imul(hash ^ Number.parseInt(hex.slice(i, i + 2), 16), FNV_PRIME);
  }
  return hash >>> 0;
}

export function parseSeed(seed: number | string): number {
  if (typeof seed === 'number') return normalizeSeed(seed);
  const text = seed.trim();
  if (UUID_PATTERN.test(text)) return hashUuid(text);
  if (DECIMAL_PATTERN.test(text)) return normalizeSeed(Number(text));
  if (HEX_PATTERN.test(text)) return normalizeSeed(Number.parseInt(text, 16));
  return hashText(text);
}
