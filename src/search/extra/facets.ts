/** Facet counting and filtering for domains, kinds and tags. */

import { compareText, normalizeQueryText } from './tokenizer';

export interface FacetDocument {
  readonly id?: unknown;
  readonly domain?: unknown;
  readonly kind?: unknown;
  readonly tags?: readonly unknown[];
}

export interface FacetFilters {
  readonly domains?: readonly unknown[];
  readonly kinds?: readonly unknown[];
  readonly tags?: readonly unknown[];
  readonly tagMode?: 'all' | 'any';
}

export interface FacetCounts {
  readonly domains: Readonly<Record<string, number>>;
  readonly kinds: Readonly<Record<string, number>>;
  readonly tags: Readonly<Record<string, number>>;
}

function normalizedValue(value: unknown): string {
  return normalizeQueryText(value);
}

function normalizedValues(value: unknown): string[] {
  const source = typeof value === 'string' ? [value] : Array.isArray(value) ? (value as readonly unknown[]) : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of source) {
    const normalized = normalizedValue(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function readDocument(value: unknown): FacetDocument | null {
  if (value === null || typeof value !== 'object') return null;
  return value as FacetDocument;
}

function countValues(values: readonly string[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => compareText(left, right)));
}

/** Count distinct normalized facet values across a corpus. */
export function buildFacets(documents: readonly FacetDocument[]): FacetCounts {
  const source = Array.isArray(documents) ? (documents as readonly unknown[]) : [];
  const domains: string[] = [];
  const kinds: string[] = [];
  const tags: string[] = [];

  for (const entry of source) {
    const document = readDocument(entry);
    if (!document) continue;
    const domain = normalizedValue(document.domain);
    const kind = normalizedValue(document.kind);
    if (domain) domains.push(domain);
    if (kind) kinds.push(kind);
    tags.push(...normalizedValues(document.tags));
  }

  return { domains: countValues(domains), kinds: countValues(kinds), tags: countValues(tags) };
}

/** True when a document satisfies every supplied facet filter. */
export function facetMatches(document: FacetDocument, filters: FacetFilters = {}): boolean {
  const source = readDocument(document);
  if (!source) return false;
  const settings: FacetFilters = filters === null || typeof filters !== 'object' ? {} : filters;

  const domains = normalizedValues(settings.domains);
  if (domains.length > 0 && !domains.includes(normalizedValue(source.domain))) return false;

  const kinds = normalizedValues(settings.kinds);
  if (kinds.length > 0 && !kinds.includes(normalizedValue(source.kind))) return false;

  const tags = normalizedValues(settings.tags);
  if (tags.length > 0) {
    const documentTags = new Set(normalizedValues(source.tags));
    const everyTag = settings.tagMode === 'all';
    const matches = everyTag ? tags.every((tag) => documentTags.has(tag)) : tags.some((tag) => documentTags.has(tag));
    if (!matches) return false;
  }
  return true;
}

/** True when at least one facet filter has usable values. */
export function hasFacetFilters(filters: FacetFilters | null | undefined): boolean {
  if (filters === null || typeof filters !== 'object') return false;
  return (
    normalizedValues(filters.domains).length > 0 ||
    normalizedValues(filters.kinds).length > 0 ||
    normalizedValues(filters.tags).length > 0
  );
}

/** Return a filtered copy of the corpus; malformed entries are skipped. */
export function applyFacets(documents: readonly FacetDocument[], filters: FacetFilters = {}): FacetDocument[] {
  const source = Array.isArray(documents) ? (documents as readonly unknown[]) : [];
  const settings: FacetFilters = filters === null || typeof filters !== 'object' ? {} : filters;
  const result: FacetDocument[] = [];
  for (const entry of source) {
    const document = readDocument(entry);
    if (!document) continue;
    if (facetMatches(document, settings)) result.push(document);
  }
  return result;
}
