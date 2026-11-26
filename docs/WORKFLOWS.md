# PARADOX Workflows

This document follows the workflows that exist in the current UI and engine code. PARADOX is **browser-only and local-first**: no backend, account, API key, or external AI service is involved. Scenario presets are **simplified fictional educational models**, not real-world predictors.

For module responsibilities, see `docs/ARCHITECTURE.md`; for engine internals, see `docs/ENGINE.md`.

## Startup path

```text
src/main.tsx
  └─ src/ui/App.tsx
       ├─ usePersistence()          [src/ui/hooks/usePersistence.ts]
       ├─ usePlayback()             [src/ui/hooks/usePlayback.ts]
       ├─ useKeyboardShortcuts()    [src/ui/hooks/useKeyboardShortcuts.ts]
       ├─ bootstrap(createAllPresets()) [src/engine/scenarios/index.ts]
       └─ ViewRouter → src/ui/views/*.tsx
```

`bootstrap()` in `src/state/store.ts` constructs the first registered scenario with `new SimulationEngine(...)`, sets `workspace.activeScenarioId`, and selects the prime branch. `usePersistence()` loads `localStorage` settings and custom scenarios from IndexedDB on mount. It does **not** restore worlds, realities, snapshots, or the workspace record; see `docs/DATA_FORMAT.md`.

## Workflow index

| Workflow | Primary UI | Store / engine calls | Result |
| --- | --- | --- | --- |
| Load a preset | `src/ui/views/ScenariosView.tsx` | `loadScenario()` → `new SimulationEngine()` | New engine, reset playback, toast |
| Generate a local scenario | `src/ui/modals/NewScenarioModal.tsx` | `generateScenario()` → `registerScenarios()` → `loadScenario()` | Deterministic custom scenario |
| Run / pause / step / reset | `src/ui/components/SimulationControls.tsx` | `play`, `pause`, `tick`, `runBatch`, `reset` | Engine advances via `SimulationEngine.step()` / `run()` |
| Inject an event | `src/ui/modals/InjectEventModal.tsx` | `injectEvent()` → `engine.injectEvent()` | Event applied to active reality |
| Adjust a live variable | `src/ui/views/WorldView.tsx` | `adjustVariable()` → `engine.adjustVariable()` | Validated/clamped change recorded |
| Fork a reality | `src/ui/modals/NewBranchModal.tsx` | `engine.createBranch()` | Isolated deep-copied child branch |
| Capture / restore snapshot | `src/ui/views/SnapshotsView.tsx` | `captureSnapshot()`, `restoreSnapshot()` | Checkpoint state copied or reapplied |
| Compare branches | `src/ui/views/CompareView.tsx` | `compareBranches()` | Trajectories, deltas, event sets |
| Inspect history / analytics | `HistoryView.tsx`, `AnalyticsView.tsx` | `filterHistory()`, `buildTrajectories()`, metrics helpers | Derived, locally computed views |
| Monte Carlo batch | `src/ui/views/MonteView.tsx` | `runMonteCarlo()` with isolated engines | Distribution statistics |
| Import / export JSON | `ImportModal.tsx`, `ExportModal.tsx` | `createImportPlan()`, `exportScenario()` etc. | Local JSON envelope only |

## 1. Loading a scenario

### Preset library

1. Open **Scenarios** from the sidebar or run the **Open scenario library** command.
2. `src/ui/views/ScenariosView.tsx` lists every registered scenario with `preset`/`Custom` badges, seed, mode, propagation limit, max steps, and step duration.
3. Click **Load** on a non-active card. `loadScenario(id)` in `src/state/store.ts`:
   - finds the scenario in `state.scenarios`,
   - constructs a fresh `SimulationEngine`,
   - sets `workspace.activeScenarioId`,
   - resets `selection` to `engine.activeBranchId`,
   - sets `isPlaying: false` and `replayStep: 0`,
   - increments `revision` and pushes a success toast.

Registered presets come from `src/engine/scenarios/index.ts` (`economy`, `civilization`, `ecosystem`, `technology`, `geopolitics`, `supply-chain`, `urban`). Their factory defaults are defined in `src/engine/scenarios/factory.ts`.

### Local generator

1. Press **N**, use the command palette, or click **New scenario**.
2. In `src/ui/modals/NewScenarioModal.tsx`, choose:
   - **Use existing** → selects a registered scenario and calls `loadScenario(presetId)`, or
   - **Generate locally** → parses `key: value` starting conditions, comma-separated event names, title, domain, and duration into `generateScenario()` from `src/engine/scenarios/custom.ts`.
3. The generated scenario is registered with `registerScenarios([scenario])`, loaded, and the view switches to `lab`.

Generated scenarios are deterministic local templates. `usePersistence()` saves the active scenario to IndexedDB through `ParadoxRepository` (`src/persistence/repository.ts`), but it does not automatically reload that scenario over the presets on startup.

## 2. Running the simulation

`src/ui/components/SimulationControls.tsx` exposes:

| Control | Store action | Engine effect |
| --- | --- | --- |
| **Play / Pause** | `play()` / `pause()` | `usePlayback()` sets an interval of `max(80, round(900 / speed))` ms and calls `tick()` |
| **Step** | `stepForward()` → `tick()` | one `engine.step()` |
| **+10** | `runBatch(10)` | `engine.run(10)` |
| **Reset** | `reset()` | `engine.reset()`, pause, `replayStep = 0` |
| **Speed** slider | `setSpeed()` | clamped to `0.25–16`; the Lab slider is `0.25–8` |

`tick()` updates `revision` and `replayStep` from `engine.activeBranch.currentState.step`, and calls `pause()` when the branch status becomes `complete`. Every store mutation that changes engine data increments `revision`, which is how imperative engine objects trigger React re-renders.

`stepBackward()` is **snapshot-based, not a full undo**: it finds the most recent snapshot with `step <= currentStep - 1` and restores it via `engine.restoreSnapshot()`; if no such snapshot exists it only updates `replayStep`. See `docs/ENGINE.md` for the step pipeline and `docs/PERFORMANCE.md` for playback costs.

### Keyboard and command palette

`src/ui/hooks/useKeyboardShortcuts.ts` ignores global shortcuts while typing or while a modal/palette/search is open.

| Input | Action |
| --- | --- |
| `Space` | Toggle play/pause |
| `ArrowRight` / `ArrowLeft` | Step forward / snapshot-based step backward |
| `N` / `B` / `E` / `S` | Open new-scenario / new-branch / inject-event / snapshot modal |
| `/` | Open search dialog |
| `Ctrl/Cmd + K` | Toggle command palette |
| `Escape` | Close modal, palette, or search |

`src/ui/components/CommandPalette.tsx` filters commands built by `buildCommands()` in `src/ui/commands.ts`; it includes playback, view navigation, branch/event/snapshot dialogs, and compare/settings commands.

## 3. Changing the live world

### Injecting an event

1. Open **Events** (`src/ui/views/EventsView.tsx`) and click **Inject** on a definition, or use **Inject event** from the Lab, shortcut `E`, or the command palette.
2. `src/ui/modals/InjectEventModal.tsx` lists `engine.scenario.events`. When opened from the event catalog, `selection.eventId` and modal payload preselect that event.
3. Optionally enable **Override probability** and choose a value from `0` to `1` in `0.05` steps.
4. **Inject** calls `store.injectEvent(event)`, which calls `engine.injectEvent(event)` on the active reality, increments `revision`, and pushes a toast. Direct effects and bounded causal propagation are recomputed from the resulting state change (`src/engine/causal/propagation.ts`).

In deterministic mode, trigger evaluation treats `probability >= 1` as success and lower probabilities as failure; in probabilistic mode it consumes the seeded RNG. See `docs/ENGINE.md`.

### Adjusting variables

`src/ui/views/WorldView.tsx` groups variable definitions and renders sliders only for numeric current values. Each change calls `store.adjustVariable(key, value)` → `engine.adjustVariable()`. Unknown keys produce a warning toast. Derived variables are displayed but not editable in this view. Active events, world metrics, and the latest recorded changes are shown alongside the sliders.

## 4. Branching, snapshots, and comparison

### Forking a reality

1. Click **Branch** in `src/ui/views/LabView.tsx`, **New reality** in `src/ui/views/ExplorerView.tsx`, press `B`, or choose **Create reality branch** from the palette.
2. `src/ui/modals/NewBranchModal.tsx` asks for a name, a divergence source (**Current live state** or a recorded snapshot), and a free-text reason. When opened from `src/ui/views/DecisionsView.tsx`, the modal payload carries an `eventId` and the reason defaults to `event`.
3. `engine.createBranch(name, snapshotId, reason, eventId)` deep-clones the selected `WorldState`. The new child is selected in `selection.branchId` and receives its own seeded timeline; later changes do not mutate the parent (`src/engine/reality/branch.ts`).

Explorer shows the parent, divergence step/time/event, children, and variable values at divergence versus current. **Activate** calls `selectBranch()` to make the selected reality the engine's active branch.

### Snapshots

- `src/ui/modals/SnapshotModal.tsx` captures a `manual` snapshot with name and description; the Lab's **Snapshot** button captures `Lab checkpoint <step>` directly.
- The engine also creates `auto` checkpoints when `autoSnapshotSteps` divides the step (`src/engine/simulation/engine.ts`).
- `src/ui/views/SnapshotsView.tsx` filters by `all`, `manual`, `auto`, `branch`, and `decision`; **Restore** selects the snapshot's branch and calls `restoreSnapshot(id)`, replacing that branch's current state with the recorded deep copy. **Delete** removes the snapshot from the in-memory engine only.
- The detail panel reads values from `snapshot.state`, not from the live branch.

### Comparing

`src/ui/views/CompareView.tsx` chooses left/right realities from `engine.branchesList` and calls `compareBranches(left, right, engine.definitions)` from `src/engine/comparison/compare.ts`. Tabs show:

- **Trajectories** — numeric series per variable plus divergence-step badge.
- **Differences** — left/right values, absolute/relative deltas, divergence step, and right-side sparkline.
- **Events** — common and unique event signatures.

**Swap** reverses the local selection; **Focus right** only updates `selection.branchId`. It does not activate that reality in the engine. Use **Activate** in Explorer to change the active branch.

## 5. Inspecting recorded output

| View | Source of truth | What it shows |
| --- | --- | --- |
| `src/ui/views/TimelineView.tsx` | `branch.timeline.entries` | SVG branch polylines, checkpoints, event markers, divergence rings |
| `src/ui/views/AnalyticsView.tsx` | `buildTrajectories()`, `computeRealityMetrics()`, event helpers | Variable trajectories/statistics, event frequency/severity, per-reality and workspace totals |
| `src/ui/views/HistoryView.tsx` | `engine.historyList` filtered by `filterHistory()` | Chronological entries with category/branch/search filters and recent replay frames |
| `src/ui/views/CausalView.tsx` | `engine.causalGraph` | Graph structure and relation details from recorded definitions |
| `src/ui/views/EventsView.tsx` | `branch.timeline.events` and `state.eventHistory` | Event definitions, trigger/effect descriptions, and fired records |

The Timeline **Replay position** slider is local view state used to extend the chart domain; it does not rewind the engine. Analytics charts use up to the last 120 numeric samples. History **Reset filters** clears category, branch, and query filters. All statistics are computed locally; no synthetic samples are generated.

## 6. Monte Carlo batch

`src/ui/views/MonteView.tsx` runs an outcome study without touching the live engine:

1. Choose an outcome variable, runs (`10–200`), max steps (`5–120`), and base seed (`0–9999`).
2. **Run batch** builds a `MonteCarloRequest` with `sampleEvery = max(1, floor(maxSteps / 20))`.
3. For each chunk of `CHUNK_SIZE = 8`, it derives a chunk seed with `deriveSeed()`, clones the scenario with a per-trial `configuration.seed`, builds a fresh `SimulationEngine`, and calls `run(maxSteps)` through `runMonteCarlo()` in `src/engine/monte/runner.ts`.
4. `setTimeout(..., 0)` yields between chunks. **Cancel** sets a ref flag; partial results are kept and reported as cancelled.
5. `computeDistributionStatistics()` (`src/engine/monte/statistics.ts`) supplies mean, median, std dev, p05/p95, 95% CI, and histogram data.

The worker protocol in `src/workers/monte.worker.ts` and `src/workers/monteClient.ts` exists, but this view does **not** call `startMonteWorker()`; batches run on the main thread in chunks. See `docs/PERFORMANCE.md`.

## 7. Import and export

### Export

`src/ui/modals/ExportModal.tsx` selects one of three envelopes produced by `src/io/export.ts`:

- `scenario` — one scenario from the registry.
- `workspace` — the current `Workspace` plus all registered scenarios.
- `snapshot` — a snapshot from the active engine.

All use `{ format, version, payload }` with `EXPORT_VERSION = 1`. **Download JSON** calls `downloadText()` from `src/io/export.ts`.

### Import

`src/ui/modals/ImportModal.tsx` accepts a `.json` file or pasted text and calls `createImportPlan()` from `src/io/import.ts`:

- `paradox-scenario` → `registerScenarios([scenario])` then `loadScenario(scenario.id)`.
- `paradox-workspace` → `registerScenarios(payload.scenarios)` then loads the first one.
- `paradox-snapshot` → reports that snapshots can be inspected but are not loaded as scenarios.

Validation is local and no network request is made. `createImportPlan()` does not call `migratePayload()`; see `docs/DATA_FORMAT.md` for envelope versions and migration limits.

## 8. Persistence behavior

`src/ui/hooks/usePersistence.ts` is the only app-level wiring to `src/persistence/`:

| Effect | Source | Destination |
| --- | --- | --- |
| Hydrate preferences | `loadSettings()` (`localStorage` key `paradox:settings`) | `applySettings()` in the Zustand store |
| Mirror preferences | store `compactMode`, `reducedMotion`, `showGrid`, `theme`, `panelSizes`, and current `view` | `saveSettings()` |
| Load custom scenarios | `ParadoxRepository.getScenarios()` (IndexedDB `scenarios` store) | `importScenarios(custom, false)` |
| Save active scenario | `scenarios` + `workspace.activeScenarioId` | `ParadoxRepository.saveScenario()` |

Limitations: changing only the current view does not trigger the settings-save effect, and startup does not navigate to the saved `defaultView`. IndexedDB restore is limited to non-preset scenarios; it does not restore worlds, realities, snapshots, workspaces, or history records. Settings toggles in `src/ui/views/SettingsView.tsx` also affect the in-session Zustand state immediately.

## Session boundaries

- Loading a scenario replaces the active engine; previous branches and snapshots remain only in that discarded engine instance.
- Export/import and repository writes deep-clone data; `createId()` and history timestamps use `Date.now()`/`Math.random()`, so compare state with `stateFingerprint()` rather than raw JSON equality (`src/engine/core/state.ts`).
- Monte Carlo trials use isolated engines and never modify the store engine.
- Everything runs in the browser tab; there is no server-side record of any workflow.
