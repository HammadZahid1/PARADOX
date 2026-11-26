/** Combine exact, prefix and fuzzy field signals into a stable bounded score. */

import { clamp } from '@/utils/clamp';
import { fuzzyScore } from './fuzzy';
import { compareText, normalizeQueryText, roundScore, tokenize } from './tokenizer';

export interface FieldWeights {
  readonly title: number;
  readonly subtitle: number;
  readonly keywords: number;
  readonly tags: number;
  readonly domain: number;
  readonly kind: number;
}

export const DEFAULT_FIELD_WEIGHTS: FieldWeights = {
  title: 6,
  subtitle: 3,
  keywords: 2,
  tags: 2,
  domain: 1.5,
  kind: 1.5,
};

const FIELD_KEYS = ['title', 'subtitle', 'keywords', 'tags', 'domain', 'kind'] as const;
export type ScoreField = (typeof FIELD_KEYS)[number];

export interface ScoreDocument {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly subtitle?: unknown;
  readonly keywords?: unknown;
  readonly tags?: readonly unknown[];
  readonly domain?: unknown;
  readonly kind?: unknown;
}

export interface ScoreOptions {
  /** Overrides individual field weights; missing or invalid values use defaults. */
  readonly weights?: Partial<FieldWeights>;
  /** Disable fuzzy token matching when false. */
  readonly useFuzzy?: boolean;
}

export interface ScoreBreakdown extends FieldWeights {
  /** Normalized total in [0, 1], including the exact-phrase bonus. */
  readonly total: number;
  /** 1 when a field exactly matches the full normalized query. */
  readonly exactPhrase: number;
}

function readWeights(options: ScoreOptions): FieldWeights {
  const settings: Partial<FieldWeights> =
    options === null || typeof options !== 'object' ? {} : options.weights ?? {};
  const weights = {} as { -readonly [Key in keyof FieldWeights]: number };
  for (const key of FIELD_KEYS) {
    const value = settings[key];
    weights[key] =
      typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : DEFAULT_FIELD_WEIGHTS[key];
  }
  return weights;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function listValue(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const entry of value as readonly unknown[]) {
    if (typeof entry === 'string') result.push(entry);
  }
  return result;
}

function fieldTokens(document: ScoreDocument, field: ScoreField): string[] {
  if (field === 'tags') return tokenize(listValue(document.tags).join(' '));
  if (field === 'domain') return tokenize(textValue(document.domain));
  if (field === 'kind') return tokenize(textValue(document.kind));
  return tokenize(textValue(document[field]));
}

function tokenSignal(token: string, tokens: readonly string[], useFuzzy: boolean): number {
  if (tokens.includes(token)) return 1;
  for (const candidate of tokens) {
    if (candidate.startsWith(token)) return 0.75;
  }
  if (!useFuzzy) return 0;
  const limit = token.length >= 5 ? 2 : 1;
  let best = 0;
  for (const candidate of tokens) {
    const score = fuzzyScore(token, candidate, { maxDistance: limit });
    if (score > best) best = score;
  }
  return best * 0.5;
}

function fieldSignal(tokens: readonly string[], queryTokens: readonly string[], useFuzzy: boolean): number {
  if (queryTokens.length === 0 || tokens.length === 0) return 0;
  let total = 0;
  for (const token of queryTokens) total += tokenSignal(token, tokens, useFuzzy);
  return total / queryTokens.length;
}

/** Raw per-field signals plus the normalized total score. */
export function scoreFields(document: ScoreDocument, query: unknown, options: ScoreOptions = {}): ScoreBreakdown {
  const source: ScoreDocument = document === null || typeof document !== 'object' ? {} : document;
  const settings: ScoreOptions = options === null || typeof options !== 'object' ? {} : options;
  const queryTokens = tokenize(query);
  const useFuzzy = settings.useFuzzy !== false;
  const weights = readWeights(settings);

  const scores = {} as { -readonly [Key in keyof FieldWeights]: number };
  for (const key of FIELD_KEYS) {
    scores[key] = fieldSignal(fieldTokens(source, key), queryTokens, useFuzzy);
  }

  const normalizedQuery = normalizeQueryText(query);
  const exactPhrase =
    normalizedQuery.length > 0 &&
    (normalizeQueryText(source.title) === normalizedQuery || normalizeQueryText(source.keywords) === normalizedQuery)
      ? 1
      : 0;

  let weightTotal = 0;
  for (const key of FIELD_KEYS) weightTotal += weights[key];
  let weighted = 0;
  for (const key of FIELD_KEYS) weighted += scores[key] * weights[key];
  const total = weightTotal > 0 ? weighted / weightTotal + exactPhrase * 0.05 : 0;

  return {
    title: roundScore(scores.title),
    subtitle: roundScore(scores.subtitle),
    keywords: roundScore(scores.keywords),
    tags: roundScore(scores.tags),
    domain: roundScore(scores.domain),
    kind: roundScore(scores.kind),
    exactPhrase,
    total: roundScore(clamp(total, 0, 1)),
  };
}

/** Stable total relevance score in [0, 1]. */
export function scoreCandidate(document: ScoreDocument, query: unknown, options: ScoreOptions = {}): number {
  return scoreFields(document, query, options).total;
}

/** Compare score breakdowns by total, then field order, for deterministic tests. */
export function compareScores(left: ScoreBreakdown, right: ScoreBreakdown): number {
  if (left.total !== right.total) return right.total - left.total;
  for (const key of FIELD_KEYS) {
    const order = compareText(left[key], right[key]);
    if (order !== 0) return -order;
  }
  return 0;
}

/** Bound an externally supplied score to the supported range. */
export function normalizeScore(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return roundScore(clamp(numeric, 0, 1));
}

/** Resolve field weights from a partial override without mutating the input. */
export function resolveFieldWeights(options: ScoreOptions = {}): FieldWeights {
  return readWeights(options === null || typeof options !== 'object' ? {} : options);
}
