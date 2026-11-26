/** Explicit, local-only synonym expansion; no network or learned data. */

import { normalizeQueryText, tokenize, uniqueTokens } from './tokenizer';

export const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['car', 'automobile', 'vehicle'],
  ['scenario', 'simulation', 'model'],
  ['event', 'trigger', 'incident'],
  ['variable', 'parameter', 'input'],
  ['branch', 'reality', 'timeline'],
  ['metric', 'measure', 'kpi'],
  ['snapshot', 'checkpoint', 'save'],
  ['search', 'find', 'lookup'],
];

export type SynonymMap = ReadonlyMap<string, readonly string[]>;

export interface ExpansionOptions {
  /** Replaces the built-in groups when provided. */
  readonly groups?: readonly (readonly string[])[];
  /** Include the original token in the result when true (default). */
  readonly includeOriginal?: boolean;
  /** Maximum number of returned terms across all tokens. */
  readonly maxExpansions?: number;
}

export interface QueryExpansion {
  readonly terms: readonly string[];
  readonly added: readonly string[];
}

function groupList(value: unknown): readonly (readonly string[])[] {
  if (!Array.isArray(value)) return SYNONYM_GROUPS;
  return value as readonly (readonly string[])[];
}

/** Build a normalized synonym lookup from explicit groups. */
export function buildSynonymMap(groups: readonly (readonly string[])[] = SYNONYM_GROUPS): SynonymMap {
  const map = new Map<string, readonly string[]>();
  for (const rawGroup of groupList(groups)) {
    if (!Array.isArray(rawGroup)) continue;
    const words = uniqueTokens(rawGroup as readonly unknown[]);
    if (words.length < 2) continue;
    for (const word of words) {
      const alternates = words.filter((candidate) => candidate !== word);
      const existing = map.get(word) ?? [];
      map.set(word, uniqueTokens([...existing, ...alternates]));
    }
  }
  return map;
}

export const DEFAULT_SYNONYM_MAP: SynonymMap = buildSynonymMap();

/** Alternates for a single normalized term; empty when unknown. */
export function synonymsFor(term: unknown, map: SynonymMap = DEFAULT_SYNONYM_MAP): string[] {
  if (!(map instanceof Map)) return [];
  const key = normalizeQueryText(term);
  if (!key) return [];
  return [...(map.get(key) ?? [])];
}

/** Expand normalized tokens in first-seen order without mutating the input. */
export function expandTokens(tokens: readonly unknown[], options: ExpansionOptions = {}): string[] {
  const settings: ExpansionOptions = options === null || typeof options !== 'object' ? {} : options;
  const map = buildSynonymMap(settings.groups);
  const includeOriginal = settings.includeOriginal !== false;
  const requested = settings.maxExpansions;
  const maximum = typeof requested === 'number' && Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 12;
  const source = Array.isArray(tokens) ? (tokens as readonly unknown[]) : [];
  const result: string[] = [];
  const seen = new Set<string>();

  const add = (value: string): void => {
    if (result.length >= maximum || !value || seen.has(value)) return;
    seen.add(value);
    result.push(value);
  };

  for (const rawToken of source) {
    const token = normalizeQueryText(rawToken);
    if (!token) continue;
    if (includeOriginal) add(token);
    for (const alternate of synonymsFor(token, map)) add(alternate);
  }
  return result;
}

/** Expand a query string into original terms plus explicit synonyms. */
export function expandQuery(query: unknown, options: ExpansionOptions = {}): QueryExpansion {
  const original = tokenize(query);
  const terms = expandTokens(original, options);
  const originalSet = new Set(original);
  return { terms, added: terms.filter((term) => !originalSet.has(term)) };
}
