import { afterEach, describe, expect, it, vi } from 'vitest';
import { estimateStorageUsage } from './usage';

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

describe('estimateStorageUsage', () => {
  it('uses navigator.storage.estimate when available', async () => {
    const estimate = vi.fn(async () => ({ usage: 2048, quota: 4096 }));
    vi.stubGlobal('navigator', { storage: { estimate } });

    expect(await estimateStorageUsage()).toEqual({ usage: 2048, quota: 4096, ratio: 0.5 });
    expect(estimate).toHaveBeenCalledOnce();
  });

  it('falls back to localStorage byte length when the API is missing', async () => {
    const storage = createLocalStorage();
    storage.setItem('a', 'b');
    storage.setItem('key', '1234');
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('localStorage', storage);

    expect(await estimateStorageUsage()).toEqual({ usage: 18, quota: 0, ratio: 0 });
  });

  it('falls back when the estimate call rejects', async () => {
    const storage = createLocalStorage();
    storage.setItem('k', 'v');
    vi.stubGlobal('navigator', { storage: { estimate: () => Promise.reject(new Error('denied')) } });
    vi.stubGlobal('localStorage', storage);

    expect(await estimateStorageUsage()).toEqual({ usage: 4, quota: 0, ratio: 0 });
  });

  it('reports zero usage when no storage API exists', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('localStorage', undefined);
    expect(await estimateStorageUsage()).toEqual({ usage: 0, quota: 0, ratio: 0 });
  });
});
