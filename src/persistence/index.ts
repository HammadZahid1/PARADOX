/** Public API for the frontend-only PARADOX persistence layer. */

export * from './storage';
export * from './settings';
export * from './migration';
export * from './usage';
export * from './repository';

export {
  PARADOX_DB_NAME,
  PARADOX_DB_VERSION,
  PARADOX_STORES,
  openParadoxDb,
  getRecord,
  putRecord,
  deleteRecord,
  getAllRecords,
  clearStore,
} from './db';
export type { ParadoxDBSchema, StoreName, StoreValue } from './db';
