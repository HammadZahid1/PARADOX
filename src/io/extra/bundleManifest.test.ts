import { describe, expect, it } from 'vitest';
import {
  BUNDLE_MANIFEST_VERSION,
  buildBundleManifest,
  checksumText,
  normalizeEntryPath,
  parseBundleManifest,
  serializeBundleManifest,
  utf8ByteLength,
  type BundleFile,
} from './bundleManifest';

const files: readonly BundleFile[] = [
  { path: 'scenario.json', content: 'hello' },
  { path: './assets/notes.txt', content: 'é😀' },
  { path: 'z/last.csv', content: 'a,b\n1,2\n' },
];

describe('bundle manifests', () => {
  it('produces deterministic checksums and byte sizes', () => {
    expect(checksumText('hello')).toBe(checksumText('hello'));
    expect(checksumText('hello')).not.toBe(checksumText('hellp'));
    expect(checksumText('hello')).toMatch(/^[0-9a-f]{8}$/);
    expect(checksumText('')).toBe('811c9dc5');
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('😀')).toBe(4);
  });

  it('sorts entries by normalized path', () => {
    const manifest = buildBundleManifest(files);
    expect(manifest.version).toBe(BUNDLE_MANIFEST_VERSION);
    expect(manifest.entries.map((entry) => entry.path)).toEqual([
      'assets/notes.txt',
      'scenario.json',
      'z/last.csv',
    ]);
    expect(manifest.entries[1]?.size).toBe(5);
    expect(buildBundleManifest([...files].reverse())).toEqual(manifest);
  });

  it('normalizes safe paths and rejects traversal or absolute paths', () => {
    expect(normalizeEntryPath('a\\b\\c.json')).toBe('a/b/c.json');
    expect(normalizeEntryPath('./a//b.json')).toBe('a/b.json');
    expect(normalizeEntryPath('../secret')).toBeNull();
    expect(normalizeEntryPath('/etc/passwd')).toBeNull();
    expect(normalizeEntryPath('C:/secret')).toBeNull();
    expect(normalizeEntryPath('')).toBeNull();
    expect(() => buildBundleManifest([{ path: '../x', content: '' }])).toThrow(/Invalid relative path/);
    expect(() => buildBundleManifest([files[0]!, files[0]!])).toThrow(/Duplicate path/);
  });

  it('round-trips through JSON and rejects malformed manifests', () => {
    const manifest = buildBundleManifest(files);
    const text = serializeBundleManifest(manifest);
    expect(parseBundleManifest(text)).toEqual(manifest);
    expect(parseBundleManifest('{')).toBeNull();
    expect(parseBundleManifest('{"version":99,"entries":[]}')).toBeNull();
    expect(parseBundleManifest(JSON.stringify({ version: 1, entries: [{ path: '../x', size: 0, checksum: '811c9dc5' }] }))).toBeNull();
    expect(parseBundleManifest(JSON.stringify({ version: 1, entries: [{ path: 'x', size: -1, checksum: '811c9dc5' }] }))).toBeNull();
    expect(parseBundleManifest(JSON.stringify({ version: 1, entries: [{ path: 'x', size: 0, checksum: 'nope' }] }))).toBeNull();
  });
});
