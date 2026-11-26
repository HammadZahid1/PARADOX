/**
 * IndexedDB access layer. All PARADOX data lives in a single versioned
 * database; record helpers keep callers independent of the idb transaction API.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { EntityId, HistoryEntry, RealityBranch, Scenario, TimelineSnapshot, WorldDefinition } from '@/engine/types';

export const PARADOX_DB_NAME = 'paradox';
export const PARADOX_DB_VERSION = 1;

/** A saved workspace layout. Optional fields keep older payloads loadable. */
export interface Workspace {
  id: EntityId;
  name: string;
  description?: string;
  scenarioIds?: readonly EntityId[];
  worldIds?: readonly EntityId[];
  branchIds?: readonly EntityId[];
  activeScenarioId?: EntityId;
  activeBranchId?: EntityId;
  panelSizes?: Record<string, number>;
  tags?: readonly string[];
  createdAt?: number;
  updatedAt?: number;
  version?: number;
}

export interface MetaRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

export interface ParadoxDBSchema extends DBSchema {
  scenarios: { key: string; value: Scenario };
  worlds: { key: string; value: WorldDefinition };
  realities: { key: string; value: RealityBranch };
  snapshots: { key: string; value: TimelineSnapshot };
  workspaces: { key: string; value: Workspace };
  history: { key: string; value: HistoryEntry };
  meta: { key: string; value: MetaRecord };
}

export type StoreName =
  | 'scenarios'
  | 'worlds'
  | 'realities'
  | 'snapshots'
  | 'workspaces'
  | 'history'
  | 'meta';
export type StoreValue<S extends StoreName> = ParadoxDBSchema[S]['value'];

export const PARADOX_STORES = [
  'scenarios',
  'worlds',
  'realities',
  'snapshots',
  'workspaces',
  'history',
  'meta',
] as const satisfies readonly StoreName[];

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wrapDbError(action: string, error: unknown): Error {
  return new Error(`IndexedDB failed to ${action}: ${describeError(error)}`, { cause: error });
}

function closeDb(db: IDBPDatabase<ParadoxDBSchema> | undefined): void {
  if (db && typeof db.close === 'function') db.close();
}

/** Opens (and upgrades, when needed) the PARADOX IndexedDB database. */
export async function openParadoxDb(): Promise<IDBPDatabase<ParadoxDBSchema>> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment; persistence requires a browser or an IndexedDB polyfill');
  }
  try {
    return await openDB<ParadoxDBSchema>(PARADOX_DB_NAME, PARADOX_DB_VERSION, {
      upgrade(db) {
        for (const store of PARADOX_STORES) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
        }
      },
    });
  } catch (error) {
    throw wrapDbError(`open "${PARADOX_DB_NAME}"`, error);
  }
}

export async function getRecord<S extends StoreName>(store: S, key: string): Promise<StoreValue<S> | undefined> {
  let db: IDBPDatabase<ParadoxDBSchema> | undefined;
  try {
    db = await openParadoxDb();
    const value = await db.get(store, key);
    return value as StoreValue<S> | undefined;
  } catch (error) {
    throw wrapDbError(`read "${key}" from "${store}"`, error);
  } finally {
    closeDb(db);
  }
}

export async function putRecord<S extends StoreName>(store: S, key: string, value: StoreValue<S>): Promise<void> {
  let db: IDBPDatabase<ParadoxDBSchema> | undefined;
  try {
    db = await openParadoxDb();
    await db.put(store, value, key);
  } catch (error) {
    throw wrapDbError(`write "${key}" to "${store}"`, error);
  } finally {
    closeDb(db);
  }
}

export async function deleteRecord<S extends StoreName>(store: S, key: string): Promise<void> {
  let db: IDBPDatabase<ParadoxDBSchema> | undefined;
  try {
    db = await openParadoxDb();
    await db.delete(store, key);
  } catch (error) {
    throw wrapDbError(`delete "${key}" from "${store}"`, error);
  } finally {
    closeDb(db);
  }
}

export async function getAllRecords<S extends StoreName>(store: S): Promise<StoreValue<S>[]> {
  let db: IDBPDatabase<ParadoxDBSchema> | undefined;
  try {
    db = await openParadoxDb();
    const records = await db.getAll(store);
    return records as StoreValue<S>[];
  } catch (error) {
    throw wrapDbError(`list records in "${store}"`, error);
  } finally {
    closeDb(db);
  }
}

export async function clearStore<S extends StoreName>(store: S): Promise<void> {
  let db: IDBPDatabase<ParadoxDBSchema> | undefined;
  try {
    db = await openParadoxDb();
    await db.clear(store);
  } catch (error) {
    throw wrapDbError(`clear "${store}"`, error);
  } finally {
    closeDb(db);
  }
}
