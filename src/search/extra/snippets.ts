/** Deterministic highlighted text snippets with stable character ranges. */

import { normalizeQueryText, normalizeText, resolveInteger, tokenize } from './tokenizer';

export type SnippetRangeKind = 'exact' | 'prefix' | 'token';

export interface SnippetRange {
  readonly start: number;
  readonly end: number;
  readonly kind: SnippetRangeKind;
}

export interface Snippet {
  /** NFKC-normalized, lowercased text that ranges index into. */
  readonly text: string;
  readonly ranges: readonly SnippetRange[];
}

export interface SnippetOptions {
  /** Characters of context kept on either side of the first and last match. */
  readonly radius?: number;
  /** Maximum number of non-overlapping ranges. */
  readonly maxRanges?: number;
}

const RANGE_PRIORITY: Readonly<Record<SnippetRangeKind, number>> = { exact: 3, prefix: 2, token: 1 };
const TOKEN_CHARACTER = /[\p{L}\p{N}\p{M}]/u;
const DEFAULT_RADIUS = 32;
const DEFAULT_MAX_RANGES = 8;

function inRange(value: number, length: number): boolean {
  return value >= 0 && value < length;
}

function chooseRanges(ranges: readonly SnippetRange[], maximum: number): SnippetRange[] {
  const ordered = [...ranges].sort(
    (left, right) =>
      left.start - right.start ||
      RANGE_PRIORITY[right.kind] - RANGE_PRIORITY[left.kind] ||
      right.end - left.end,
  );
  const chosen: SnippetRange[] = [];
  for (const range of ordered) {
    if (chosen.length >= maximum) break;
    const overlaps = chosen.some((existing) => range.start < existing.end && existing.start < range.end);
    if (!overlaps) chosen.push(range);
  }
  return chosen.sort((left, right) => left.start - right.start || left.end - right.end);
}

/** Build a normalized snippet with deterministic, non-overlapping highlight ranges. */
export function buildSnippet(text: unknown, query: unknown, options: SnippetOptions = {}): Snippet {
  const normalized = normalizeText(text);
  if (!normalized) return { text: '', ranges: [] };
  const settings: SnippetOptions = options === null || typeof options !== 'object' ? {} : options;
  const radius = resolveInteger(settings.radius, DEFAULT_RADIUS, 0);
  const maximum = resolveInteger(settings.maxRanges, DEFAULT_MAX_RANGES, 0);
  const queryText = normalizeQueryText(query);
  if (!queryText) return { text: normalized.slice(0, radius * 2), ranges: [] };

  const matches: SnippetRange[] = [];
  let cursor = 0;
  while (cursor <= normalized.length - queryText.length) {
    const index = normalized.indexOf(queryText, cursor);
    if (index < 0) break;
    matches.push({ start: index, end: index + queryText.length, kind: 'exact' });
    cursor = index + Math.max(1, queryText.length);
  }

  if (matches.length === 0) {
    for (const token of tokenize(queryText)) {
      let tokenCursor = 0;
      while (tokenCursor <= normalized.length - token.length) {
        const index = normalized.indexOf(token, tokenCursor);
        if (index < 0) break;
        const previous = inRange(index - 1, normalized.length) ? normalized[index - 1] ?? '' : '';
        const kind: SnippetRangeKind = TOKEN_CHARACTER.test(previous) ? 'token' : 'prefix';
        matches.push({ start: index, end: index + token.length, kind });
        tokenCursor = index + Math.max(1, token.length);
      }
    }
  }

  const chosen = chooseRanges(matches, maximum);
  if (chosen.length === 0) return { text: normalized.slice(0, radius * 2), ranges: [] };

  const first = chosen[0]!;
  const last = chosen[chosen.length - 1]!;
  const windowStart = Math.max(0, first.start - radius);
  const windowEnd = Math.min(normalized.length, Math.max(last.end, first.end) + radius);
  const ranges = chosen.map((range) => ({
    start: range.start - windowStart,
    end: range.end - windowStart,
    kind: range.kind,
  }));
  return { text: normalized.slice(windowStart, windowEnd), ranges };
}

/** Insert highlight markers around snippet ranges without changing the source text. */
export function renderSnippet(snippet: Snippet, open = '<mark>', close = '</mark>'): string {
  if (snippet === null || typeof snippet !== 'object' || !Array.isArray(snippet.ranges)) return '';
  const text = typeof snippet.text === 'string' ? snippet.text : '';
  const ranges = [...snippet.ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  let cursor = 0;
  let rendered = '';
  for (const range of ranges) {
    const start = Math.max(cursor, Math.min(text.length, range.start));
    const end = Math.max(start, Math.min(text.length, range.end));
    if (start >= end) continue;
    rendered += text.slice(cursor, start) + open + text.slice(start, end) + close;
    cursor = end;
  }
  return rendered + text.slice(cursor);
}
