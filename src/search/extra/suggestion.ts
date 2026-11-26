/** Query suggestions from a local corpus using phrase prefixes and token completion. */

import type { SearchDocument } from '@/search';
import { clamp } from '@/utils/clamp';
import { compareText, normalizeQueryText, resolveInteger, roundScore, tokenize, uniqueTokens } from './tokenizer';

export type SuggestionCorpusEntry = string | SearchDocument;

export interface SuggestionOptions {
  readonly limit?: number;
  readonly maxEntries?: number;
}

export interface Suggestion {
  readonly text: string;
  readonly score: number;
  readonly source: string;
}

interface CorpusItem {
  readonly text: string;
  readonly tokens: readonly string[];
}

function corpusText(value: unknown): string {
  if (typeof value === 'string') return normalizeQueryText(value);
  if (value === null || typeof value !== 'object') return '';
  const document = value as Partial<SearchDocument>;
  return normalizeQueryText(
    [document.title, document.subtitle, document.keywords].filter((part): part is string => typeof part === 'string').join(' '),
  );
}

function corpusItems(corpus: readonly SuggestionCorpusEntry[]): CorpusItem[] {
  const source = Array.isArray(corpus) ? (corpus as readonly unknown[]) : [];
  const items: CorpusItem[] = [];
  for (const entry of source) {
    const text = corpusText(entry);
    if (!text) continue;
    items.push({ text, tokens: uniqueTokens(tokenize(text)) });
  }
  return items;
}

function matchCompletion(head: readonly string[], partial: string, tokens: readonly string[]): string | null {
  if (!partial) return null;
  let cursor = 0;
  for (const term of head) {
    let next = -1;
    for (let index = cursor; index < tokens.length; index += 1) {
      const token = tokens[index] ?? '';
      if (token === term || token.startsWith(term)) {
        next = index + 1;
        break;
      }
    }
    if (next < 0) return null;
    cursor = next;
  }
  for (let index = cursor; index < tokens.length; index += 1) {
    const token = tokens[index] ?? '';
    if (token.startsWith(partial)) return token;
  }
  return null;
}

/** Suggest normalized phrase prefixes and completed tokens, ranked deterministically. */
export function suggestQueries(
  corpus: readonly SuggestionCorpusEntry[],
  query: unknown,
  options: SuggestionOptions = {},
): Suggestion[] {
  const normalizedQuery = normalizeQueryText(query);
  if (!normalizedQuery) return [];
  const queryTokens = tokenize(normalizedQuery);
  if (queryTokens.length === 0) return [];

  const settings: SuggestionOptions = options === null || typeof options !== 'object' ? {} : options;
  const limit = resolveInteger(settings.limit, 5, 0);
  const maxEntries = resolveInteger(settings.maxEntries, 500, 0);
  const partial = queryTokens[queryTokens.length - 1] ?? '';
  const head = queryTokens.slice(0, -1);
  const byText = new Map<string, Suggestion>();

  const add = (text: string, score: number, source: string): void => {
    if (!text) return;
    const bounded = roundScore(clamp(score, 0, 1));
    const existing = byText.get(text);
    if (!existing || bounded > existing.score) byText.set(text, { text, score: bounded, source });
  };

  for (const item of corpusItems(corpus).slice(0, maxEntries)) {
    if (item.text.startsWith(normalizedQuery)) add(item.text, 1, item.text);
    const completion = matchCompletion(head, partial, item.tokens);
    if (completion) {
      const suggestion = [...head, completion].join(' ');
      const ratio = partial.length / Math.max(1, completion.length);
      const headBonus = head.length > 0 ? 0.1 : 0;
      add(suggestion, 0.55 + 0.35 * ratio + headBonus, item.text);
    }
  }

  return [...byText.values()]
    .sort((left, right) => right.score - left.score || compareText(left.text, right.text))
    .slice(0, limit);
}

/** Alphabetically ordered token completions for a partial token. */
export function completeToken(
  corpus: readonly SuggestionCorpusEntry[],
  prefix: unknown,
  limit = 5,
): string[] {
  const token = tokenize(prefix)[0] ?? normalizeQueryText(prefix);
  if (!token) return [];
  const maximum = resolveInteger(limit, 5, 0);
  const matches = new Set<string>();
  for (const item of corpusItems(corpus)) {
    for (const candidate of item.tokens) {
      if (candidate.startsWith(token)) matches.add(candidate);
    }
  }
  return [...matches].sort(compareText).slice(0, maximum);
}
