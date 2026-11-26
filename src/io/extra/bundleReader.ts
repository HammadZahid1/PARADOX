/** Verify that a set of text files matches a bundle manifest. */

import {
  checksumText,
  normalizeEntryPath,
  parseBundleManifest,
  utf8ByteLength,
  type BundleFile,
  type BundleManifest,
} from './bundleManifest';

export interface BundleVerification {
  readonly valid: boolean;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly tampered: readonly string[];
}

function sortPaths(paths: string[]): string[] {
  return paths.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

export function verifyBundle(
  manifest: BundleManifest,
  files: readonly BundleFile[],
): BundleVerification {
  const actual = new Map<string, string>();
  for (const file of files) {
    const path = normalizeEntryPath(file.path) ?? file.path;
    actual.set(path, file.content);
  }

  const missing: string[] = [];
  const tampered: string[] = [];
  for (const entry of manifest.entries) {
    const content = actual.get(entry.path);
    if (content === undefined) {
      missing.push(entry.path);
    } else if (utf8ByteLength(content) !== entry.size || checksumText(content) !== entry.checksum) {
      tampered.push(entry.path);
    }
  }

  const expected = new Set(manifest.entries.map((entry) => entry.path));
  const extra = sortPaths([...actual.keys()].filter((path) => !expected.has(path)));
  sortPaths(missing);
  sortPaths(tampered);

  return {
    valid: missing.length === 0 && extra.length === 0 && tampered.length === 0,
    missing,
    extra,
    tampered,
  };
}

/** Parse a serialized manifest before verification; null means the manifest itself is invalid. */
export function verifyBundleText(
  manifestText: string,
  files: readonly BundleFile[],
): BundleVerification | null {
  const manifest = parseBundleManifest(manifestText);
  return manifest === null ? null : verifyBundle(manifest, files);
}
