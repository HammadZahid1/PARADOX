import { describe, expect, it } from 'vitest';
import {
  buildBundleManifest,
  serializeBundleManifest,
  type BundleFile,
} from './bundleManifest';
import { verifyBundle, verifyBundleText } from './bundleReader';

const files: readonly BundleFile[] = [
  { path: 'scenario.json', content: '{"name":"Alpha"}' },
  { path: 'notes/readme.txt', content: 'hello world' },
];

describe('bundle verification', () => {
  it('accepts an exact bundle', () => {
    const manifest = buildBundleManifest(files);
    expect(verifyBundle(manifest, files)).toEqual({
      valid: true,
      missing: [],
      extra: [],
      tampered: [],
    });
  });

  it('reports missing, extra and tampered files deterministically', () => {
    const manifest = buildBundleManifest(files);
    const actual: readonly BundleFile[] = [
      files[0]!,
      { path: 'notes/readme.txt', content: 'hello worlds' },
      { path: 'zzz.txt', content: 'new' },
      { path: 'aaa.txt', content: 'new' },
    ];
    const result = verifyBundle(manifest, actual);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([]);
    expect(result.tampered).toEqual(['notes/readme.txt']);
    expect(result.extra).toEqual(['aaa.txt', 'zzz.txt']);
  });

  it('reports missing files and ignores path syntax differences', () => {
    const manifest = buildBundleManifest(files);
    const result = verifyBundle(manifest, [{ path: './notes\\readme.txt', content: 'hello world' }]);
    expect(result.missing).toEqual(['scenario.json']);
    expect(result.extra).toEqual([]);
    expect(result.tampered).toEqual([]);
  });

  it('verifies serialized manifests and rejects malformed ones', () => {
    const text = serializeBundleManifest(buildBundleManifest(files));
    expect(verifyBundleText(text, files)?.valid).toBe(true);
    expect(verifyBundleText('{}', files)).toBeNull();
  });

  it('detects same-size tampering via checksum', () => {
    const manifest = buildBundleManifest([{ path: 'x.txt', content: 'abc' }]);
    expect(verifyBundle(manifest, [{ path: 'x.txt', content: 'abd' }]).tampered).toEqual(['x.txt']);
  });
});
