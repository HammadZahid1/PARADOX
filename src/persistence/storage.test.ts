import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageAdapter, MemoryStorageAdapter } from './storage';

function createLocalStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(entries.keys())[index] ?? null;
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MemoryStorageAdapter', () => {
  it('serializes values, returns clones and lists namespaced keys', async () => {
    const adapter = new MemoryStorageAdapter('test:');
    const value = { nested: { count: 1 }, list: [1, 2] };
    await adapter.set('alpha', value);
    value.nested.count = 99;

    expect(await adapter.get<typeof value>('alpha')).toEqual({ nested: { count: 1 }, list: [1, 2] });
    expect(await adapter.list()).toEqual(['alpha']);
    expect(await adapter.list('al')).toEqual(['alpha']);
    expect(await adapter.list('beta')).toEqual([]);
  });

  it('deletes single keys and clears only matching prefixes', async () => {
    const adapter = new MemoryStorageAdapter('test:');
    await adapter.set('draft:one', 1);
    await adapter.set('draft:two', 2);
    await adapter.set('live', 3);

    await adapter.clear('draft:');
    expect(await adapter.list()).toEqual(['live']);

    await adapter.delete('live');
    expect(await adapter.get('live')).toBeNull();
    expect(await adapter.list()).toEqual([]);
  });

  it('returns null for missing keys and rejects undefined writes', async () => {
    const adapter = new MemoryStorageAdapter();
    expect(await adapter.get('missing')).toBeNull();
    await expect(adapter.set('empty', undefined)).rejects.toThrow(/Cannot store undefined/);
    expect(await adapter.list()).toEqual([]);
  });
});

describe('LocalStorageAdapter', () => {
  it('stores JSON under the configured prefix and tolerates corrupt data', async () => {
    vi.stubGlobal('localStorage', createLocalStorage());
    const adapter = new LocalStorageAdapter('px:');

    await adapter.set('user', { id: 7 });
    expect(localStorage.getItem('px:user')).toBe('{"id":7}');
    expect(await adapter.get('user')).toEqual({ id: 7 });

    localStorage.setItem('px:broken', '{');
    expect(await adapter.get('broken')).toBeNull();
  });

  it('reports serialization and environment failures clearly', async () => {
    vi.stubGlobal('localStorage', createLocalStorage());
    const adapter = new LocalStorageAdapter('px:');
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await expect(adapter.set('cycle', circular)).rejects.toThrow(/Failed to serialize/);

    vi.stubGlobal('localStorage', undefined);
    await expect(adapter.get('user')).rejects.toThrow(/not available/);
  });
});
