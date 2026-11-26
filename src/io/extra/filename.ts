/** Safe, deterministic export filenames derived from scenario titles. */

import { slugify } from '@/utils/text';

export interface FilenameOptions {
  readonly extension?: string;
  readonly fallback?: string;
  readonly maxLength?: number;
}

const RESERVED_NAMES = new Set<string>([
  'con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);

function sanitizeExtension(extension: string): string {
  const cleaned = extension.replace(/^\.+/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned.length > 0 ? cleaned : 'json';
}

function truncateStem(stem: string, maxLength: number): string {
  const characters = [...stem];
  if (characters.length <= maxLength) return stem;
  return characters.slice(0, maxLength).join('').replace(/-+$/, '');
}

export function sanitizeScenarioFilename(title: string, options: FilenameOptions = {}): string {
  const extension = sanitizeExtension(options.extension ?? 'json');
  const fallback = slugify(options.fallback ?? 'scenario') || 'scenario';
  const requested = options.maxLength;
  const maxLength =
    typeof requested === 'number' && Number.isFinite(requested)
      ? Math.max(8, Math.floor(requested))
      : 80;

  const stem = slugify(title) || fallback;
  const safeStem = RESERVED_NAMES.has(stem) ? `_${stem}` : stem;
  return `${truncateStem(safeStem, maxLength)}.${extension}`;
}

/** Insert a collision number before the final extension. */
export function applyCollisionSuffix(filename: string, suffix: number): string {
  if (!Number.isInteger(suffix) || suffix < 1) {
    throw new Error('Collision suffix must be a positive integer');
  }
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot) : '';
  return `${stem}-${suffix}${extension}`;
}
