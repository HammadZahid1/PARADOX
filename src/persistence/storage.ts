/**
 * Small key/value storage adapters used by the frontend persistence layer.
 * Keys are namespaced so PARADOX data never collides with unrelated app data.
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** Returns keys without the adapter namespace, optionally filtered by a prefix. */
  list(prefix?: string): Promise<string[]>;
  /** Removes all namespaced entries, optionally restricted to a key prefix. */
  clear(prefix?: string): Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function namespacedKey(prefix: string, key: string): string {
  return `${prefix}${key}`;
}

function matchesPrefix(key: string, prefix: string): boolean {
  return prefix.length === 0 || key.startsWith(prefix);
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly explicitStorage: Storage | undefined;

  constructor();
  constructor(prefix?: string, storage?: Storage);
  constructor(storage: Storage);
  constructor(prefixOrStorage: string | Storage = 'paradox:', storage?: Storage) {
    if (typeof prefixOrStorage === 'string') {
      this.prefix = prefixOrStorage;
      this.explicitStorage = storage;
    } else {
      this.prefix = 'paradox:';
      this.explicitStorage = prefixOrStorage;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const storage = this.storage();
    try {
      const raw = storage.getItem(namespacedKey(this.prefix, key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt or unreadable entries must not crash settings loading.
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const storage = this.storage();
    const storageKey = namespacedKey(this.prefix, key);
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new Error(`[LocalStorageAdapter] Failed to serialize value for "${key}": ${errorMessage(error)}`, { cause: error });
    }
    if (serialized === undefined) {
      throw new Error(`[LocalStorageAdapter] Cannot store undefined for "${key}"`);
    }
    try {
      storage.setItem(storageKey, serialized);
    } catch (error) {
      throw new Error(`[LocalStorageAdapter] Failed to write "${key}": ${errorMessage(error)}`, { cause: error });
    }
  }

  async delete(key: string): Promise<void> {
    const storage = this.storage();
    try {
      storage.removeItem(namespacedKey(this.prefix, key));
    } catch (error) {
      throw new Error(`[LocalStorageAdapter] Failed to delete "${key}": ${errorMessage(error)}`, { cause: error });
    }
  }

  async list(prefix = ''): Promise<string[]> {
    const storage = this.storage();
    try {
      const result: string[] = [];
      const fullPrefix = namespacedKey(this.prefix, prefix);
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key !== null && key.startsWith(fullPrefix)) keys.push(key);
      }
      for (const key of keys) result.push(key.slice(this.prefix.length));
      return result;
    } catch (error) {
      throw new Error(`[LocalStorageAdapter] Failed to list keys: ${errorMessage(error)}`, { cause: error });
    }
  }

  async clear(prefix = ''): Promise<void> {
    const storage = this.storage();
    try {
      const fullPrefix = namespacedKey(this.prefix, prefix);
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key !== null && key.startsWith(fullPrefix)) keys.push(key);
      }
      for (const key of keys) storage.removeItem(key);
    } catch (error) {
      throw new Error(`[LocalStorageAdapter] Failed to clear keys: ${errorMessage(error)}`, { cause: error });
    }
  }

  private storage(): Storage {
    const candidate = this.explicitStorage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    if (candidate === undefined) {
      throw new Error('[LocalStorageAdapter] localStorage is not available in this environment');
    }
    return candidate;
  }
}

/** In-memory adapter with the same JSON round-trip semantics as localStorage. */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly entries = new Map<string, string>();

  constructor(private readonly prefix = 'paradox:') {}

  async get<T>(key: string): Promise<T | null> {
    const raw = this.entries.get(namespacedKey(this.prefix, key));
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new Error(`[MemoryStorageAdapter] Failed to serialize value for "${key}": ${errorMessage(error)}`, { cause: error });
    }
    if (serialized === undefined) {
      throw new Error(`[MemoryStorageAdapter] Cannot store undefined for "${key}"`);
    }
    this.entries.set(namespacedKey(this.prefix, key), serialized);
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(namespacedKey(this.prefix, key));
  }

  async list(prefix = ''): Promise<string[]> {
    const result: string[] = [];
    const fullPrefix = namespacedKey(this.prefix, prefix);
    for (const key of this.entries.keys()) {
      if (key.startsWith(fullPrefix)) result.push(key.slice(this.prefix.length));
    }
    return result;
  }

  async clear(prefix = ''): Promise<void> {
    const fullPrefix = namespacedKey(this.prefix, prefix);
    for (const key of [...this.entries.keys()]) {
      if (matchesPrefix(key, fullPrefix)) this.entries.delete(key);
    }
  }
}
