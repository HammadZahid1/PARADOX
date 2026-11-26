/** Typo-tolerant matching helpers with bounded, deterministic scores. */

import { clamp } from '@/utils/clamp';
import { normalizeText, resolveInteger, roundScore } from './tokenizer';

export const DEFAULT_MAX_DISTANCE = 3;

export interface FuzzyOptions {
  /** Maximum Levenshtein edits considered; larger distances are rejected. */
  readonly maxDistance?: number;
  /** Also score near-contiguous subsequences when true. */
  readonly includeSubsequence?: boolean;
}

function codePoints(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return Array.from(normalizeText(value));
}

function distanceLimit(value: unknown, fallback: number): number {
  return resolveInteger(value, fallback, 0);
}

/**
 * Levenshtein distance over Unicode code points, capped at `maxDistance + 1`.
 * The cap keeps pathological inputs cheap while preserving an "over limit" signal.
 */
export function levenshtein(left: unknown, right: unknown, maxDistance: number = DEFAULT_MAX_DISTANCE): number {
  const limit = distanceLimit(maxDistance, DEFAULT_MAX_DISTANCE);
  const overLimit = limit + 1;
  const first = codePoints(left);
  const second = codePoints(right);
  if (Math.abs(first.length - second.length) > limit) return overLimit;
  if (first.length === 0) return Math.min(second.length, overLimit);
  if (second.length === 0) return Math.min(first.length, overLimit);

  let previous: number[] = Array.from({ length: second.length + 1 }, (_unused, index) => index);
  let current: number[] = new Array<number>(second.length + 1);

  for (let row = 1; row <= first.length; row += 1) {
    current[0] = row;
    let rowMinimum = row;
    for (let column = 1; column <= second.length; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
      const insertion = (current[column - 1] ?? overLimit) + 1;
      const deletion = (previous[column] ?? overLimit) + 1;
      const substitution = (previous[column - 1] ?? overLimit) + substitutionCost;
      const value = Math.min(insertion, deletion, substitution);
      current[column] = value;
      if (value < rowMinimum) rowMinimum = value;
    }
    if (rowMinimum > limit) return overLimit;
    const swap = previous;
    previous = current;
    current = swap;
  }
  return Math.min(previous[second.length] ?? overLimit, overLimit);
}

/** True when every code point of `needle` appears in `haystack` in order. */
export function isSubsequence(needle: unknown, haystack: unknown): boolean {
  const short = codePoints(needle);
  const long = codePoints(haystack);
  if (short.length === 0) return true;
  let index = 0;
  for (const point of long) {
    if (point !== short[index]) continue;
    index += 1;
    if (index === short.length) return true;
  }
  return false;
}

/** True when a contiguous slice of `haystack` is within `maxDistance` edits of `needle`. */
export function isFuzzySubsequence(needle: unknown, haystack: unknown, maxDistance = 1): boolean {
  const short = codePoints(needle);
  const long = codePoints(haystack);
  const limit = distanceLimit(maxDistance, 1);
  if (short.length === 0) return true;
  if (long.length === 0) return false;
  if (Math.abs(short.length - long.length) > limit) return false;

  const minimumLength = Math.max(0, short.length - limit);
  const maximumLength = Math.min(long.length, short.length + limit);
  for (let length = minimumLength; length <= maximumLength; length += 1) {
    for (let start = 0; start + length <= long.length; start += 1) {
      const window = long.slice(start, start + length).join('');
      if (levenshtein(short.join(''), window, limit) <= limit) return true;
    }
  }
  return false;
}

/** Bounded similarity in [0, 1]; zero means no usable match. */
export function fuzzyScore(query: unknown, candidate: unknown, options: FuzzyOptions = {}): number {
  const first = codePoints(query);
  const second = codePoints(candidate);
  if (first.length === 0 || second.length === 0) return 0;
  const needle = first.join('');
  const haystack = second.join('');
  if (needle === haystack) return 1;

  const settings: FuzzyOptions = options === null || typeof options !== 'object' ? {} : options;
  const limit = distanceLimit(settings.maxDistance, DEFAULT_MAX_DISTANCE);
  const distance = levenshtein(needle, haystack, limit);
  let score = 0;
  if (distance <= limit) {
    score = 0.55 + 0.45 * (1 - distance / Math.max(needle.length, haystack.length));
  } else if (isSubsequence(needle, haystack)) {
    score = 0.45;
  } else if (settings.includeSubsequence !== false && isFuzzySubsequence(needle, haystack, Math.max(1, limit))) {
    score = 0.35;
  }
  return roundScore(clamp(score, 0, 1));
}
