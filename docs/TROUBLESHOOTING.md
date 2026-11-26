# Troubleshooting

This page covers reproducible problems in the implemented code. PARADOX is browser-only; there is no server log to inspect and no remote data to clear.

## Quick triage checklist

Before changing state or deleting data, check these local signals:

| Check | Where | What it tells you |
| --- | --- | --- |
| `BRANCH` / `VARIABLES` / `EVENTS` / `REV` | `src/ui/components/StatusBar.tsx` | Which branch is active and whether a store mutation reached views |
| `SEED` | `src/ui/components/StatusBar.tsx` | Whether the expected branch seed is in use |
| Console filter/query | `src/ui/components/EventConsole.tsx` | Whether rule, event, causal, or control logs were produced |
| `localStorage['paradox:settings']` | DevTools Application tab | Whether preferences were written |
| IndexedDB `paradox` database | DevTools Application tab | Whether scenarios were persisted |
| `npm run typecheck` and `npm test` | terminal | Whether the failure is code-level rather than browser-state |

`REV` increments only through store actions in `src/state/store.ts`. If you mutate an engine directly from DevTools and the view does not change, call `useParadox.getState().setEngine(engine)` or another store action to publish the change.

## Reproducibility: two runs differ

**Symptom:** raw JSON of two `WorldState` objects differs, or a test comparing objects fails.

**Cause:** ids and timestamps are intentionally non-deterministic. `createId()` in `src/utils/id.ts` uses `Date.now()` and `Math.random()`; snapshots and history entries include wall-clock time. The engine's reproducibility contract is fingerprint-based.

**Fix:**

```ts
import { statesEqual, stateFingerprint } from '@/engine/core/state';
// Prefer:
statesEqual(a.activeBranch.currentState, b.activeBranch.currentState);
// Or inspect:
stateFingerprint(b.activeBranch.currentState);
```

Also confirm both runs use the same `scenario.configuration.seed`, event array order, and branch history. Child branch seeds depend on `branches.size` (`SimulationEngine.createBranch()` in `src/engine/simulation/engine.ts`), so creating branches in a different order changes later draws.

## Events never fire

Check `src/engine/events/triggers.ts` and `src/engine/events/scheduler.ts` in order:

1. `event.enabled` must be true.
2. Cooldown: `cooldownActive()` blocks if `step - lastFiredStep < cooldownSteps`.
3. Structural trigger must be due: `scheduled.atStep` must equal the current step; `recurring` uses `(step - start) % interval === 0`.
4. All `event.conditions` must pass `evaluateCondition()`.
5. In `deterministic` mode, `event.probability < 1` means **never fires**. Set it to `1` or switch `configuration.mode` to `probabilistic`.

Manual injection goes through `EventEngine.inject()` and bypasses trigger evaluation; see `src/ui/modals/InjectEventModal.tsx`.

## Events fire repeatedly or activated events are missed

`activate` effects are collected by `applyEventEffects()` and stored in `SimulationEngine.activatedQueue`; they are excluded from the current step and appended after it, so they fire on the **next** step. `cancel` effects are only logged by `SimulationEngine.step()`; there is no full deferred queue implementation here. `EventQueue` in `src/engine/events/queue.ts` exists as a utility but the main step pipeline uses `scheduleEvents()` instead.

## Causal effects do not propagate

Inspect `src/engine/causal/propagation.ts`:

- `configuration.propagationLimit <= 0` disables propagation entirely.
- Only numeric changes are propagated (`typeof change.from/to === 'number'`).
- `correlates-with` and `custom` edge types are descriptive and never change state.
- A node is visited once per propagation; cycles are stopped, not looped.
- Edges with `delaySteps > 0` become pending entries applied on a later step.

Edges must connect nodes whose `refId` matches a `VariableDefinition.id`. `buildGraphFromDefinitions()` (`src/engine/causal/graph.ts`) only creates `causes` edges from event effects; variable-to-variable edges must be authored or supplied via `SimulationEngineOptions.causalGraph`.

## Branch state appears to change unexpectedly

- Branching uses `branchFromState()` / `createReality()` (`src/engine/reality/branch.ts`) with `deepClone()`. Parent state is not mutated by a child step.
- `selectBranch()` changes `activeBranchId`; `tick()` always steps the active branch. Check the `BRANCH` value in `StatusBar` (`src/ui/components/StatusBar.tsx`).
- `reset()` in `SimulationEngine` clears **all** branches, snapshots, states, and history and recreates Prime Reality.
- `restoreSnapshot()` overwrites only the active branch's `currentState`; it does not rewind the timeline or other branches.

`stepBackward()` in `src/state/store.ts` restores the newest snapshot at or before the target step. If no snapshot exists, the revision still increments but the state is unchanged. Presets create an automatic snapshot every 10 steps by default.

## Persistence seems missing after reload

Persistence is partially wired: `src/ui/App.tsx` calls `usePersistence()` (`src/ui/hooks/usePersistence.ts`), which applies `loadSettings()`, mirrors settings to `saveSettings()`, loads non-preset scenarios from IndexedDB, and saves the active scenario. It does not restore worlds, realities, snapshots, workspaces, or history records, and loading a different scenario replaces the in-memory engine. For direct storage work from an integration, call `ParadoxRepository` directly:

```ts
import { ParadoxRepository } from '@/persistence';
const repo = new ParadoxRepository();
await repo.saveScenario(scenario);
const scenarios = await repo.getScenarios();
```

If IndexedDB is blocked (private mode, disabled storage), `openParadoxDb()` throws an explicit `IndexedDB is not available...` error. `LocalStorageAdapter.get()` returns `null` on corrupt JSON instead of throwing. `usePersistence()` swallows repository load/save rejections with `.catch(() => undefined)`, so the UI may show no error when storage fails; call the repository directly if you need to see the rejection.

## Import fails

`createImportPlan()` (`src/io/import.ts`) requires a JSON object envelope:

```json
{ "format": "paradox-scenario", "version": 1, "payload": { ... } }
```

- Unsupported formats or versions outside 1–3 are rejected by `validateEnvelope()`.
- `paradox-world` passes envelope validation but has no import-plan handler.
- Snapshot envelopes are validated but not loaded as scenarios by `ImportModal.tsx`.
- Scenario payloads must pass `validateScenario()`; duplicate ids in a workspace payload fail `validateScenarioList()`.

The UI shows validation messages with `role="alert"`; no data enters the store on failure.

## Monte Carlo is slow or freezes the UI

`MonteView` (`src/ui/views/MonteView.tsx`) runs batches on the main thread in 8-trial chunks using `setTimeout` yields. Lower Runs/Max steps sliders for responsiveness. The Web Worker implementation in `src/workers/monte.worker.ts` and `startMonteWorker()` in `src/workers/monteClient.ts` are available as a library boundary but are not used by the view. Cancellation sets `cancelRef.current`; completed trials are retained in local state.

If a cancelled batch shows partial results, that is intended: `runMonteCarlo()` returns `cancelled: true` with the trials completed before cancellation. The view also uses a `tokenRef` so an older batch cannot overwrite a newer one.

## Console entries are missing or stale

`SimulationEngine.getConsole()` filters by `kind`, `branchId`, and lowercase substring query. `EventConsole` only offers the filters `all`, `event`, `causal`, `variable`, `branch`, `control`, and `snapshot`, plus the “Search console” input. Entries with kinds such as `init`, `probability`, `transition`, `decision`, or `error` are still stored but are only visible under `all`.

Older entries disappear because `log()` trims the buffer with `slice(-consoleCapacity)`; the default capacity is 500 and can be raised via `SimulationEngineOptions.consoleCapacity` when constructing an engine directly. Console entries are not persisted by `usePersistence()`.

## Playback stops or will not start

`src/ui/hooks/usePlayback.ts` sets an interval of `max(80, round(900 / speed))` ms while `isPlaying` is true and calls `pause()` when `activeBranch.status === 'complete'`. `useParadox.tick()` also pauses on completion. If pressing Space does nothing, check whether a dialog is open or focus is in an input: `src/ui/hooks/useKeyboardShortcuts.ts` ignores global shortcuts in those cases. `loadScenario()` always pauses and clears `replayStep`, so loading a preset during playback is expected to stop it.

## Visualization errors

`ErrorBoundary.tsx` catches render failures in views and shows “Visualization error” with a retry button. `UniverseView` uses WebGL via `@react-three/fiber`; if the browser cannot create a WebGL context, use another view or disable hardware acceleration. There is no explicit fallback component for WebGL unavailability in this revision.

## Build or test failures

```powershell
npm run typecheck
npm test
npm run build
```

- Path alias errors should be `@/...` (see `vite.config.ts` and `vitest.config.ts`).
- Tests use jsdom with `@/` aliases; browser-only APIs need guards or injected adapters.
- `npm run lint` may fail because the script exists but no ESLint config/dependency is present. Use `npm run typecheck` and `npm test` as the effective checks.

## Reduced motion not remembered

The `reducedMotion` flag in `src/state/store.ts` is applied during the session and read by `Modal.tsx` and `UniverseView.tsx`. On startup, `usePersistence()` applies `loadSettings()`; toggling the setting triggers `saveSettings()` to the `paradox:settings` key. If it appears lost, check that `localStorage` is available for the origin. The OS-level `@media (prefers-reduced-motion: reduce)` rule in `src/styles/index.css` still applies automatically.
