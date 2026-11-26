/** Deterministic text normalization and tokenization for local search helpers. */

const EMPTY_STOP_WORDS: ReadonlySet<string> = new Set<string>();

export const DEFAULT_STOP_WORDS: readonly string[] = [
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'was',
  'were',
  'with',
];

const DEFAULT_STOP_WORD_SET: ReadonlySet<string> = new Set(DEFAULT_STOP_WORDS);
const TOKEN_PATTERN = /[\p{L}\p{N}\p{M}]+/gu;

export interface TokenizeOptions {
  /** Replaces the default stop-word list when provided. */
  readonly stopWords?: readonly string[];
  /** Keep every token, including stop words, when true. */
  readonly keepStopWords?: boolean;
}

/** NFKC-normalized, lowercased text; non-strings normalize to the empty string. */
export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').toLowerCase();
}

/** Normalized single-spaced text suitable for query identity and display previews. */
export function normalizeQueryText(value: unknown): string {
  return normalizeText(value).trim().replace(/\s+/g, ' ');
}

/** Locale-independent ordering for stable tie-breaking. */
export function compareText(left: unknown, right: unknown): number {
  const first = typeof left === 'string' ? left : '';
  const second = typeof right === 'string' ? right : '';
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

/** Round a finite score to a fixed precision; non-finite values become zero. */
export function roundScore(value: number, digits = 6): number {
  if (!Number.isFinite(value)) return 0;
  const places = Math.max(0, Math.min(12, Math.floor(digits)));
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Read a bounded integer option without throwing on malformed values. */
export function resolveInteger(value: unknown, fallback: number, minimum = 0): number {
  const minimumValue = Number.isFinite(minimum) ? Math.floor(minimum) : 0;
  const fallbackValue = Number.isFinite(fallback) ? Math.floor(fallback) : minimumValue;
  if (typeof value !== 'number' || !Number.isFinite(value)) return Math.max(minimumValue, fallbackValue);
  return Math.max(minimumValue, Math.floor(value));
}

function splitTokens(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return normalizeText(value).match(TOKEN_PATTERN) ?? [];
}

function resolveStopWords(options: TokenizeOptions): ReadonlySet<string> {
  if (options === null || typeof options !== 'object') return DEFAULT_STOP_WORD_SET;
  if (options.keepStopWords === true) return EMPTY_STOP_WORDS;
  if (!Array.isArray(options.stopWords)) return DEFAULT_STOP_WORD_SET;
  const words = new Set<string>();
  for (const entry of options.stopWords as readonly unknown[]) {
    for (const part of splitTokens(entry)) words.add(part);
  }
  return words;
}

/** Split text into normalized word tokens with predictable stop-word filtering. */
export function tokenize(value: unknown, options: TokenizeOptions = {}): string[] {
  const stopWords = resolveStopWords(options);
  return splitTokens(value).filter((token) => !stopWords.has(token));
}

/** Split text into normalized tokens without applying stop-word filtering. */
export function tokenizeRaw(value: unknown): string[] {
  return splitTokens(value);
}

/** Deduplicate normalized token values while preserving first-seen order. */
export function uniqueTokens(values: readonly unknown[]): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values as readonly unknown[]) {
    const normalized = normalizeQueryText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

/** True when a token is filtered by the resolved stop-word set. */
export function isStopWord(token: unknown, options: TokenizeOptions = {}): boolean {
  const normalized = normalizeQueryText(token);
  return normalized.length > 0 && resolveStopWords(options).has(normalized);
}
