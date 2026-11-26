import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_STORAGE_KEY, SETTINGS_SCHEMA_VERSION } from './settings';

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

describe('settings persistence', () => {
  it('returns defaults when localStorage has no settings', () => {
    vi.stubGlobal('localStorage', createLocalStorage());
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips partial updates and preserves unrelated settings', () => {
    vi.stubGlobal('localStorage', createLocalStorage());

    expect(saveSettings({ compactMode: true, panelSizes: { left: 240 } })).toBe(true);
    expect(saveSettings({ theme: 'nebula' })).toBe(true);

    expect(loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      compactMode: true,
      panelSizes: { left: 240 },
      theme: 'nebula',
    });
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain(`"schemaVersion":${SETTINGS_SCHEMA_VERSION}`);
  });

  it('falls back safely on corrupt JSON, wrong schema and invalid fields', () => {
    const storage = createLocalStorage();
    vi.stubGlobal('localStorage', storage);

    storage.setItem(SETTINGS_STORAGE_KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);

    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, schemaVersion: 99, theme: 'broken' }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);

    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, showGrid: 'yes', panelSizes: { left: 'wide' } }));
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, showGrid: true, panelSizes: {} });
  });

  it('returns false when storage rejects the write', () => {
    const storage = createLocalStorage();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    vi.stubGlobal('localStorage', storage);
    expect(saveSettings({ compactMode: true })).toBe(false);
  });
});
