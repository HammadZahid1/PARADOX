/**
 * Typed repository for all persistent PARADOX entities. Every write is
 * validated with the engine validators and cloned before it reaches storage.
 */

import type { EntityId, HistoryEntry, RealityBranch, Scenario, TimelineSnapshot, WorldDefinition, WorldState } from '@/engine/types';
import {
  combine,
  failure,
  requireNumber,
  requireString,
  success,
  validateScenario,
  validateWorldDefinition,
  validateWorldState,
  type ValidationResult,
} from '@/engine/validation';
import { deepClone } from '@/utils/clone';
import type { StorageAdapter } from './storage';
import {
  clearStore,
  deleteRecord,
  getAllRecords,
  getRecord,
  putRecord,
  type MetaRecord,
  type StoreName,
  type StoreValue,
  type Workspace,
} from './db';

export type { MetaRecord, Workspace } from './db';

/** Minimal record-store surface; the default implementation is IndexedDB. */
export interface ParadoxRecordStore {
  get<S extends StoreName>(store: S, key: string): Promise<StoreValue<S> | undefined>;
  put<S extends StoreName>(store: S, key: string, value: StoreValue<S>): Promise<void>;
  delete<S extends StoreName>(store: S, key: string): Promise<void>;
  getAll<S extends StoreName>(store: S): Promise<StoreValue<S>[]>;
  clear<S extends StoreName>(store: S): Promise<void>;
}

const defaultRecordStore: ParadoxRecordStore = {
  get: <S extends StoreName>(store: S, key: string) => getRecord(store, key),
  put: <S extends StoreName>(store: S, key: string, value: StoreValue<S>) => putRecord(store, key, value),
  delete: <S extends StoreName>(store: S, key: string) => deleteRecord(store, key),
  getAll: <S extends StoreName>(store: S) => getAllRecords(store),
  clear: <S extends StoreName>(store: S) => clearStore(store),
};

export type RepositoryBackend = ParadoxRecordStore | StorageAdapter;

function isRecordStore(backend: RepositoryBackend): backend is ParadoxRecordStore {
  return 'put' in backend && 'getAll' in backend;
}

function storageKey(store: StoreName, key: string): string {
  return `${store}:${key}`;
}

/** Adapts a simple key/value adapter (for tests or SSR) to the record-store API. */
function adaptStorageAdapter(adapter: StorageAdapter): ParadoxRecordStore {
  return {
    get: async <S extends StoreName>(store: S, key: string) =>
      (await adapter.get<StoreValue<S>>(storageKey(store, key))) ?? undefined,
    put: <S extends StoreName>(store: S, key: string, value: StoreValue<S>) =>
      adapter.set(storageKey(store, key), value),
    delete: (store: StoreName, key: string) => adapter.delete(storageKey(store, key)),
    getAll: async <S extends StoreName>(store: S) => {
      const keys = await adapter.list(`${store}:`);
      const records: StoreValue<S>[] = [];
      for (const key of keys) {
        const value = await adapter.get<StoreValue<S>>(key);
        if (value !== null) records.push(value);
      }
      return records;
    },
    clear: (store: StoreName) => adapter.clear(`${store}:`),
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function storageFailure(store: StoreName, error: unknown): ValidationResult {
  return failure(`storage.${store}`, `Persistence write failed: ${describeError(error)}`);
}

function validateOptionalString(value: unknown, path: string): ValidationResult {
  return value === undefined ? success() : requireString(value, path, true);
}

function validateOptionalNumber(value: unknown, path: string): ValidationResult {
  return value === undefined ? success() : requireNumber(value, path);
}

function validateIdList(ids: readonly EntityId[] | undefined, path: string): ValidationResult {
  if (ids === undefined) return success();
  return combine(...ids.map((id, index) => requireString(id, `${path}[${index}]`)));
}

function validatePartialWorldState(state: Partial<WorldState> | undefined): ValidationResult {
  if (state === undefined) return success();
  return combine(
    validateOptionalString(state.id, 'world.initialState.id'),
    validateOptionalNumber(state.time, 'world.initialState.time'),
    validateOptionalNumber(state.step, 'world.initialState.step'),
    validateOptionalNumber(state.seed, 'world.initialState.seed'),
  );
}

function validateSnapshotPayload(snapshot: TimelineSnapshot): ValidationResult {
  return combine(
    requireString(snapshot.id, 'snapshot.id'),
    requireString(snapshot.name, 'snapshot.name'),
    requireString(snapshot.branchId, 'snapshot.branchId'),
    requireNumber(snapshot.step, 'snapshot.step'),
    requireNumber(snapshot.time, 'snapshot.time'),
    requireNumber(snapshot.createdAt, 'snapshot.createdAt'),
    validateWorldState(snapshot.state),
  );
}

function validateRealityPayload(reality: RealityBranch): ValidationResult {
  return combine(
    requireString(reality.id, 'reality.id'),
    requireString(reality.name, 'reality.name'),
    validateWorldState(reality.initialState),
    validateWorldState(reality.currentState),
    ...reality.timeline.snapshots.map(validateSnapshotPayload),
  );
}

function validateHistoryPayload(entry: HistoryEntry): ValidationResult {
  return combine(
    requireString(entry.id, 'history.id'),
    requireString(entry.kind, 'history.kind'),
    requireString(entry.summary, 'history.summary'),
    requireString(entry.branchId, 'history.branchId'),
    requireNumber(entry.step, 'history.step'),
    requireNumber(entry.time, 'history.time'),
    requireNumber(entry.timestamp, 'history.timestamp'),
  );
}

function validateWorkspacePayload(workspace: Workspace): ValidationResult {
  return combine(
    requireString(workspace.id, 'workspace.id'),
    requireString(workspace.name, 'workspace.name'),
    validateOptionalString(workspace.description, 'workspace.description'),
    validateOptionalString(workspace.activeScenarioId, 'workspace.activeScenarioId'),
    validateOptionalString(workspace.activeBranchId, 'workspace.activeBranchId'),
    validateIdList(workspace.scenarioIds, 'workspace.scenarioIds'),
    validateIdList(workspace.worldIds, 'workspace.worldIds'),
    validateIdList(workspace.branchIds, 'workspace.branchIds'),
    validateIdList(workspace.tags, 'workspace.tags'),
    validateOptionalNumber(workspace.createdAt, 'workspace.createdAt'),
    validateOptionalNumber(workspace.updatedAt, 'workspace.updatedAt'),
    validateOptionalNumber(workspace.version, 'workspace.version'),
  );
}

export class ParadoxRepository {
  private readonly store: ParadoxRecordStore;

  constructor(backend: RepositoryBackend = defaultRecordStore) {
    this.store = isRecordStore(backend) ? backend : adaptStorageAdapter(backend);
  }

  async saveScenario(scenario: Scenario): Promise<ValidationResult> {
    const validation = validateScenario(scenario);
    return validation.valid ? this.write('scenarios', scenario.id, scenario) : validation;
  }

  async getScenarios(): Promise<Scenario[]> {
    return this.readAll('scenarios');
  }

  async deleteScenario(id: EntityId): Promise<ValidationResult> {
    return this.deleteById('scenarios', id);
  }

  async saveWorld(world: WorldDefinition): Promise<ValidationResult> {
    const validation = combine(validateWorldDefinition(world), validatePartialWorldState(world.initialState));
    return validation.valid ? this.write('worlds', world.id, world) : validation;
  }

  async getWorlds(): Promise<WorldDefinition[]> {
    return this.readAll('worlds');
  }

  async deleteWorld(id: EntityId): Promise<ValidationResult> {
    return this.deleteById('worlds', id);
  }

  async saveReality(reality: RealityBranch): Promise<ValidationResult> {
    const validation = validateRealityPayload(reality);
    return validation.valid ? this.write('realities', reality.id, reality) : validation;
  }

  async getRealities(): Promise<RealityBranch[]> {
    return this.readAll('realities');
  }

  async deleteReality(id: EntityId): Promise<ValidationResult> {
    return this.deleteById('realities', id);
  }

  async saveSnapshot(snapshot: TimelineSnapshot): Promise<ValidationResult> {
    const validation = validateSnapshotPayload(snapshot);
    return validation.valid ? this.write('snapshots', snapshot.id, snapshot) : validation;
  }

  async getSnapshots(): Promise<TimelineSnapshot[]> {
    return this.readAll('snapshots');
  }

  async deleteSnapshot(id: EntityId): Promise<ValidationResult> {
    return this.deleteById('snapshots', id);
  }

  async saveWorkspace(workspace: Workspace): Promise<ValidationResult> {
    const validation = validateWorkspacePayload(workspace);
    return validation.valid ? this.write('workspaces', workspace.id, workspace) : validation;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return this.readAll('workspaces');
  }

  async deleteWorkspace(id: EntityId): Promise<ValidationResult> {
    return this.deleteById('workspaces', id);
  }

  async appendHistory(entry: HistoryEntry): Promise<ValidationResult> {
    const validation = validateHistoryPayload(entry);
    return validation.valid ? this.write('history', entry.id, entry) : validation;
  }

  async getHistory(branchId?: EntityId): Promise<HistoryEntry[]> {
    const entries = await this.readAll('history');
    const filtered = branchId === undefined ? entries : entries.filter((entry) => entry.branchId === branchId);
    return filtered.sort((left, right) =>
      left.timestamp - right.timestamp || left.step - right.step || left.id.localeCompare(right.id),
    );
  }

  async deleteHistoryEntry(id: EntityId): Promise<ValidationResult> {
    return this.deleteById('history', id);
  }

  async getMeta<T>(key: string): Promise<T | null> {
    const record = await this.store.get('meta', key);
    if (record === undefined) return null;
    return deepClone(record.value) as T;
  }

  async setMeta<T>(key: string, value: T): Promise<ValidationResult> {
    const validation = combine(
      requireString(key, 'meta.key'),
      value === undefined ? failure('meta.value', 'Meta value must be defined') : success(),
    );
    if (!validation.valid) return validation;
    const record: MetaRecord<T> = { key, value: deepClone(value), updatedAt: Date.now() };
    return this.write('meta', key, record);
  }

  private async write<S extends StoreName>(store: S, key: string, value: StoreValue<S>): Promise<ValidationResult> {
    try {
      await this.store.put(store, key, deepClone(value));
      return success();
    } catch (error) {
      return storageFailure(store, error);
    }
  }

  private async deleteById(store: StoreName, id: EntityId): Promise<ValidationResult> {
    const validation = requireString(id, `${store}.id`);
    if (!validation.valid) return validation;
    try {
      await this.store.delete(store, id);
      return success();
    } catch (error) {
      return storageFailure(store, error);
    }
  }

  private async readAll<S extends StoreName>(store: S): Promise<StoreValue<S>[]> {
    const records = await this.store.getAll(store);
    return records.map((record) => deepClone(record));
  }
}
