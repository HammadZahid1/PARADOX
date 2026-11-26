/** Deterministic bundle manifests for in-memory text files. */

import { isPlainObject } from '@/utils/clone';

export const BUNDLE_MANIFEST_VERSION = 1;

export interface BundleFile {
  readonly path: string;
  readonly content: string;
}

export interface BundleManifestEntry {
  readonly path: string;
  readonly size: number;
  readonly checksum: string;
}

export interface BundleManifest {
  readonly version: number;
  readonly entries: readonly BundleManifestEntry[];
}

/** Return a canonical relative path, or null for absolute/traversal paths. */
export function normalizeEntryPath(path: string): string | null {
  const forward = path.replace(/\\/g, '/');
  if (forward.startsWith('/') || /^[A-Za-z]:\//.test(forward) || forward.includes('\u0000')) {
    return null;
  }
  const segments: string[] = [];
  for (const segment of forward.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') return null;
    segments.push(segment);
  }
  return segments.length > 0 ? segments.join('/') : null;
}

/** FNV-1a over UTF-16 code units: stable across runtimes and independent of locale. */
export function checksumText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** UTF-8 byte length, including surrogate pairs, without runtime-specific encoders. */
export function utf8ByteLength(text: string): number {
  let size = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code <= 0x7f) {
      size += 1;
    } else if (code <= 0x7ff) {
      size += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1) ?? 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        size += 4;
        index += 1;
      } else {
        size += 3;
      }
    } else {
      size += 3;
    }
  }
  return size;
}

export function buildBundleManifest(files: readonly BundleFile[]): BundleManifest {
  const entries: BundleManifestEntry[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const path = normalizeEntryPath(file.path);
    if (path === null) throw new Error(`Invalid relative path: ${file.path}`);
    if (seen.has(path)) throw new Error(`Duplicate path: ${path}`);
    seen.add(path);
    entries.push({
      path,
      size: utf8ByteLength(file.content),
      checksum: checksumText(file.content),
    });
  }
  entries.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return { version: BUNDLE_MANIFEST_VERSION, entries };
}

export function serializeBundleManifest(manifest: BundleManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function parseBundleManifest(text: string): BundleManifest | null {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (!isPlainObject(value) || value['version'] !== BUNDLE_MANIFEST_VERSION) return null;
  const rawEntries = value['entries'];
  if (!Array.isArray(rawEntries)) return null;

  const entries: BundleManifestEntry[] = [];
  for (const raw of rawEntries) {
    if (!isPlainObject(raw)) return null;
    const path = raw['path'];
    const size = raw['size'];
    const checksum = raw['checksum'];
    if (typeof path !== 'string' || normalizeEntryPath(path) !== path) return null;
    if (typeof size !== 'number' || !Number.isInteger(size) || size < 0) return null;
    if (typeof checksum !== 'string' || !/^[0-9a-f]{8}$/.test(checksum)) return null;
    entries.push({ path, size, checksum });
  }
  return { version: BUNDLE_MANIFEST_VERSION, entries };
}
