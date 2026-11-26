# Data Format

All data is local, JSON-shaped, and versioned. No server schema, database URL, API key, or remote service is involved.

## Domain objects

Defined in `src/engine/types/` and re-exported from `src/engine/types/index.ts`:

| Object | File | Key fields |
| --- | --- | --- |
| `WorldState` | `world.ts` | `id`, `time`, `step`, `variables: Record<EntityId, ScalarValue>`, `parameters`, `activeEvents`, `eventHistory`, `metrics`, `seed`, `version`, `changes` |
| `VariableDefinition` | `core.ts` | `id`, `key`, `name`, `type`, `initial`, optional `unit`, `min`, `max`, `constraints`, `expression` |
| `SimulationEvent` | `events.ts` | `id`, `name`, `type`, `trigger`, `probability`, `conditions`, `effects`, optional `outcomes` |
| `CausalGraph` | `causal.ts` | `nodes: CausalNode[]`, `edges: CausalRelationship[]` with signed `strength` and optional `delaySteps` |
| `RealityBranch` | `reality.ts` | `parentId`, `branchPointStep`, `initialState`, `currentState`, `timeline`, `seed`, `decisions` |
| `Timeline` | `timeline.ts` | `entries`, `snapshots`, `events` |
| `Scenario` | `scenario.ts` | Variables, parameters, rules, events, configuration, objectives, tags, disclaimer |
| `Workspace` | `workspace.ts` | `id`, `name`, `scenarioIds`, `activeScenarioId`, `settings`, timestamps, `version` |
| `MonteCarloRequest` / `MonteCarloResult` | `results.ts` | Runs, base seed, variable key, statistics, per-run states/timelines |

`ScalarValue = number | boolean | string` (`src/engine/types/core.ts`). Entity ids are plain strings; no runtime branded-id type is used.

State identity is derived from hash rather than stored as a UUID: `createInitialState()` uses `hashString(seed + variable ids)` and `advanceClock()` uses `hashString(stateId:step:seed)` (`src/engine/core/state.ts`).

## Import/export envelope

`src/io/export.ts` emits pretty-printed JSON with `EXPORT_VERSION = 1`:

```json
{
  "format": "paradox-scenario",
  "version": 1,
  "payload": { "id": "economy", "name": "Macroeconomic Cycle" }
}
```

Envelope type (`src/engine/validation/import.ts`):

```ts
interface ImportEnvelope {
  format: 'paradox-scenario' | 'paradox-world'
       | 'paradox-workspace' | 'paradox-snapshot';
  version: number;
  payload: unknown;
}
```

Exporters in `src/io/export.ts`:

| Function | Format | Payload |
| --- | --- | --- |
| `exportScenario(scenario)` | `paradox-scenario` | One `Scenario` |
| `exportWorkspace(workspace, scenarios)` | `paradox-workspace` | `{ workspace, scenarios }` |
| `exportSnapshot(snapshot)` | `paradox-snapshot` | One `TimelineSnapshot` |
| `downloadText(filename, text)` | — | Blob download with `application/json;charset=utf-8`; URL is revoked after click |

There is no CSV, Markdown, NDJSON, binary bundle, or shareable-link exporter in this revision.

`parseImportEnvelope()` accepts any JSON object with string `format`, numeric `version`, and a `payload` field. `validateEnvelope()` checks that the format is one of the four values, `version` is 1–3, and payload is non-null.

`createImportPlan()` (`src/io/import.ts`) is the actual import gate:

- `paradox-scenario` → `validateScenario()`, then register/load via `ImportModal.tsx`.
- `paradox-workspace` → validates `{ workspace, scenarios }` with `validateScenarioList()`.
- `paradox-snapshot` → checks `name`, `branchId`, finite `step`; the UI only inspects it and does not load it as a scenario.
- `paradox-world` is accepted by `validateEnvelope()` but has no `createImportPlan()` branch and no exporter.

`migratePayload()` in `src/persistence/migration.ts` handles v1→v2 (`tags`) and v2→v3 (`configuration`) for plain-object payloads; current version is 3. `createImportPlan()` does not call `migratePayload()` in this revision.

## IndexedDB schema

`src/persistence/db.ts` opens database `paradox`, version 1, creating these object stores on upgrade:

| Store | Value type | Written by |
| --- | --- | --- |
| `scenarios` | `Scenario` | `ParadoxRepository.saveScenario()` |
| `worlds` | `WorldDefinition` | `saveWorld()` |
| `realities` | `RealityBranch` | `saveReality()` |
| `snapshots` | `TimelineSnapshot` | `saveSnapshot()` |
| `workspaces` | saved workspace layout | `saveWorkspace()` |
| `history` | `HistoryEntry` | `appendHistory()` |
| `meta` | `{ key, value, updatedAt }` | `setMeta()` |

Helpers: `openParadoxDb()`, `getRecord()`, `putRecord()`, `deleteRecord()`, `getAllRecords()`, `clearStore()`. Each opens and closes a connection per call. When `indexedDB` is unavailable, `openParadoxDb()` throws an explicit error.

`ParadoxRepository` (`src/persistence/repository.ts`) validates payloads with `src/engine/validation/` and deep-clones values on write/read. It can also wrap any `StorageAdapter` (for tests or non-browser contexts) by prefixing keys as `<store>:<key>`.

## localStorage settings

`src/persistence/settings.ts` uses raw `localStorage` key `paradox:settings` and `SETTINGS_SCHEMA_VERSION = 1`:

```ts
interface AppSettings {
  schemaVersion: number;
  compactMode: boolean;
  reducedMotion: boolean;
  showGrid: boolean;
  defaultView: string;
  panelSizes: Record<string, number>;
  theme: string;
}
```

`normalizeSettings()` falls back to `DEFAULT_SETTINGS` on version mismatch, malformed JSON, or missing storage. `usePersistence()` calls `loadSettings()` on mount and `saveSettings()` when preferences change; `SettingsView.tsx` writes Zustand state that the hook mirrors. Startup does not navigate to the saved `defaultView`, and changing only the view does not trigger a settings write.

`LocalStorageAdapter` in `src/persistence/storage.ts` uses its own `paradox:` key prefix and a JSON round-trip; `MemoryStorageAdapter` mirrors that behavior for tests.

## Validation format

`src/engine/validation/common.ts` defines:

```ts
interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
```

`combine()` aggregates results and treats any error-severity issue as invalid. Validators exist for scenarios, worlds, world states, variables, events, causal graphs, and import envelopes under `src/engine/validation/`.

## Reproducibility notes for persisted runs

- `stateFingerprint()` (`src/engine/core/state.ts`) is the canonical equality check; raw object JSON differs because ids/timestamps use `Date.now()` and `Math.random()` in `src/utils/id.ts`.
- Snapshots are full `WorldState` copies; replay from a snapshot uses `restoreState()` and restores current state only.
- Monte Carlo results include `request`, `values`, `runs`, `statistics`, `elapsedMs`, and `cancelled`; elapsed time is inherently run-specific.

## Other envelope payloads

```json
{
  "format": "paradox-workspace",
  "version": 1,
  "payload": { "workspace": { "id": "workspace_default" }, "scenarios": [] }
}
```

```json
{
  "format": "paradox-snapshot",
  "version": 1,
  "payload": { "id": "snap_1", "name": "Checkpoint 10", "branchId": "branch_1", "step": 10 }
}
```

`paradox-world` is declared in `ImportEnvelope` but has no exporter and no `createImportPlan()` branch; `validateEnvelope()` will accept it while import dispatch will not process it.

## Validation call chain

| Stage | Function | Path |
| --- | --- | --- |
| JSON parse | `parseImportEnvelope()` | `src/engine/validation/import.ts` |
| Envelope shape | `validateEnvelope()` | `src/engine/validation/import.ts` |
| Payload dispatch | `createImportPlan()` | `src/io/import.ts` |
| Scenario shape | `validateScenario()` / `validateScenarioList()` | `src/engine/validation/scenario.ts` |
| Snapshot shape | local `validateSnapshot()` | `src/io/import.ts` |
| Store mutation | `registerScenarios()` / `loadScenario()` | `src/state/store.ts` |

## Storage boundary summary

`AppSettings` lives in `localStorage`; everything else in `src/persistence/` uses IndexedDB through `idb`. `LocalStorageAdapter` and `MemoryStorageAdapter` are test/integration adapters with a `paradox:` key prefix and are not the app's normal scenario path. No data leaves the browser profile unless `downloadText()` produces a local file.
