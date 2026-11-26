/** User preferences persisted to localStorage with safe, typed fallbacks. */

import { deepClone, isPlainObject } from '@/utils/clone';

export const SETTINGS_STORAGE_KEY = 'paradox:settings';
export const SETTINGS_SCHEMA_VERSION = 1;

export interface AppSettings {
  schemaVersion: number;
  compactMode: boolean;
  reducedMotion: boolean;
  showGrid: boolean;
  defaultView: string;
  panelSizes: Record<string, number>;
  theme: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  compactMode: false,
  reducedMotion: false,
  showGrid: true,
  defaultView: 'universe',
  panelSizes: {},
  theme: 'void',
};

function readStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function validPanelSizes(value: unknown): value is Record<string, number> {
  return isPlainObject(value) && Object.values(value).every((size) => typeof size === 'number' && Number.isFinite(size));
}

/** Coerces any parsed value into a complete settings object. */
export function normalizeSettings(value: unknown): AppSettings {
  const settings = deepClone(DEFAULT_SETTINGS);
  if (!isPlainObject(value) || value.schemaVersion !== SETTINGS_SCHEMA_VERSION) return settings;

  if (typeof value.compactMode === 'boolean') settings.compactMode = value.compactMode;
  if (typeof value.reducedMotion === 'boolean') settings.reducedMotion = value.reducedMotion;
  if (typeof value.showGrid === 'boolean') settings.showGrid = value.showGrid;
  if (typeof value.defaultView === 'string' && value.defaultView.trim().length > 0) settings.defaultView = value.defaultView;
  if (validPanelSizes(value.panelSizes)) settings.panelSizes = deepClone(value.panelSizes);
  if (typeof value.theme === 'string' && value.theme.trim().length > 0) settings.theme = value.theme;
  return settings;
}

export function loadSettings(): AppSettings {
  const storage = readStorage();
  if (storage === null) return deepClone(DEFAULT_SETTINGS);
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return deepClone(DEFAULT_SETTINGS);
    return normalizeSettings(JSON.parse(raw) as unknown);
  } catch {
    return deepClone(DEFAULT_SETTINGS);
  }
}

/** Merges a partial update with the current settings. Returns false on storage failure. */
export function saveSettings(settings: Partial<AppSettings>): boolean {
  const next = normalizeSettings({ ...loadSettings(), ...settings });
  const storage = readStorage();
  if (storage === null) return false;
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
