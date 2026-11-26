# PARADOX Architecture

PARADOX is a **browser-only, local-first** alternate-reality simulation laboratory. It runs entirely in the browser tab: there is no backend, no account, no API key, and no external AI service. Climate/geopolitics presets are **simplified fictional educational models**, not real-world predictors.

This document describes the code that exists in this repository. `docs/ROADMAP.md` is a planning document; unchecked items there are **not** implemented.

## Layer map

| Layer | Path | Responsibility |
| --- | --- | --- |
| Entry | `src/main.tsx`, `index.html` | React root, stylesheet import, `#root` mount |
| UI shell | `src/ui/App.tsx`, `src/ui/ViewRouter.tsx` | Layout, lazy view loading, dialogs, toasts |
| Views/components | `src/ui/views/`, `src/ui/components/`, `src/ui/modals/` | Screens, charts, controls, data entry |
| Interaction | `src/ui/hooks/`, `src/ui/commands.ts`, `src/search/` | Playback clock, shortcuts, commands, local search |
| App state | `src/state/store.ts`, `src/state/types.ts` | Zustand store, engine instance, selection, UI state |
| Simulation engine | `src/engine/simulation/engine.ts` | Step orchestration, branches, snapshots, history |
| Engine subsystems | `src/engine/core/`, `events/`, `causal/`, `random/`, `timeline/`, `reality/`, `analytics/`, `comparison/` | Rules, triggers, propagation, RNG, history, metrics |
| Domain types/validation | `src/engine/types/`, `src/engine/validation/` | Shared schemas and `ValidationResult` helpers |
| Scenarios | `src/engine/scenarios/` | Presets, deterministic scenario factory, local generator |
| Persistence | `src/persistence/` | IndexedDB records, localStorage settings, migrations |
| Import/export | `src/io/` | Versioned JSON envelope, download helper |
| Workers | `src/workers/`, `src/engine/monte/` | Monte Carlo worker protocol, client, runner, statistics |
| Utilities | `src/utils/` | IDs, hashing, cloning, math, graph helpers |

## Startup and data flow

```text
index.html
  └─ src/main.tsx → createRoot(<App />)
       └─ src/ui/App.tsx
            ├─ bootstrap(createAllPresets())     [src/engine/scenarios/index.ts]
            │    └─ new SimulationEngine(scenario) [src/engine/simulation/engine.ts]
            │         └─ createInitialState()      [src/engine/core/state.ts]
            ├─ usePlayback()                     [src/ui/hooks/usePlayback.ts]
            ├─ useKeyboardShortcuts()            [src/ui/hooks/useKeyboardShortcuts.ts]
            └─ ViewRouter → src/ui/views/*.tsx  (React.lazy)
```

Every mutating store action increments `revision` in `src/state/store.ts`. Views read the engine object plus `revision` so they re-render after imperative engine mutations. The engine itself is mutable behind that store; variable values inside states are updated through new objects (`advanceClock`, `setVariable`) rather than in-place writes.

## One simulation step

`SimulationEngine.step()` in `src/engine/simulation/engine.ts` is the canonical pipeline:

1. `advanceClock()` (`src/engine/core/state.ts`) produces the next step/time and a new state identity.
2. `applyRules()` (`src/engine/core/rules.ts`) applies enabled rules in descending priority.
3. `EventEngine.processStep()` (`src/engine/events/engine.ts`) evaluates triggers using `src/engine/events/scheduler.ts`.
4. Delayed causal effects due this step are applied by `applyPendingPropagations()` (`src/engine/causal/propagation.ts`).
5. Immediate causal propagation runs with `config.propagationLimit` as depth budget.
6. `appendTimelineEntry()` (`src/engine/timeline/timeline.ts`) records the frame; `captureSnapshot()` may run when `autoSnapshotSteps` divides the step.
7. History and console entries are appended, and a `StepResult` is returned.

`run()` loops `step()` with optional `onProgress` and cooperative `shouldCancel` callbacks.

## Key invariants

- **Branch isolation:** `createReality()` / `branchFromState()` in `src/engine/reality/branch.ts` deep-clone the base `WorldState` using `deepClone()` (`src/utils/clone.ts`). A child branch never mutates its parent state.
- **Seeded randomness:** `SeededRandom` (Mulberry32, `src/engine/random/rng.ts`) is re-created per step from the branch seed and step number. No clock-driven randomness enters engine transitions.
- **Canonical comparison:** `stateFingerprint()` (`src/engine/core/state.ts`) sorts variables and metrics for reproducibility checks. IDs and `Date.now()` metadata are not part of the fingerprint.
- **Bounded causality:** `propagateChange()` uses a `visited` set, a breadth-first queue, and `limit` depth. `correlates-with` and `custom` edges never mutate state.
- **Local validation:** `src/engine/validation/` provides `ValidationResult` / `ValidationIssue` used by repository and import paths before data enters the store.

## Persistence boundary

`src/persistence/db.ts` opens IndexedDB database `paradox` (version 1) with stores `scenarios`, `worlds`, `realities`, `snapshots`, `workspaces`, `history`, `meta`. `ParadoxRepository` (`src/persistence/repository.ts`) validates and deep-clones records. `src/persistence/settings.ts` stores `AppSettings` in `localStorage` under `paradox:settings`.

**Current wiring scope:** `src/ui/App.tsx` calls `usePersistence()` (`src/ui/hooks/usePersistence.ts`) in addition to `bootstrap(createAllPresets())`. That hook applies `loadSettings()` on mount, mirrors settings through `saveSettings()`, loads non-preset scenarios from IndexedDB, and saves the active scenario through `ParadoxRepository`. It does **not** restore or autosave worlds, realities, snapshots, workspaces, or history records. Settings toggles in `src/ui/views/SettingsView.tsx` also change Zustand state for the current session.

## Monte Carlo boundary

`src/engine/monte/runner.ts`, `statistics.ts`, and `src/workers/` implement a guarded Web Worker protocol, cancellation, derived trial seeds, and distribution statistics. The current UI path in `src/ui/views/MonteView.tsx` **does not use the worker**: it creates isolated `SimulationEngine` instances in chunks of 8 trials and yields with `setTimeout(..., 0)` on the main thread. Workers are an available library boundary, not the active UI execution path.

## Non-goals in this revision

No server sync, no authentication, no telemetry upload, no real-time data feeds, no real-world forecasting, no release pipeline, and no package split (the project is a single Vite app despite the roadmap's monorepo phases). CI checks are configured in `.github/workflows/ci.yml`.

## Engine subsystem inventory

| Subsystem | Path | Responsibility |
| --- | --- | --- |
| State transitions | `src/engine/core/state.ts`, `variables.ts`, `rules.ts`, `expression.ts` | Initial state, clock advance, scalar effects, conditions, safe arithmetic |
| Events | `src/engine/events/` | Scheduling, triggers, effects, cooldowns, activation/cancellation queues |
| Causality | `src/engine/causal/` | Graph construction, analysis/layout, bounded and delayed propagation |
| Randomness | `src/engine/random/` | Mulberry32 streams and local distribution helpers |
| Timeline | `src/engine/timeline/` | Entries, snapshots, history records, replay frames |
| Reality | `src/engine/reality/` | Branch creation, ancestry/tree helpers, decision alternatives |
| Analytics | `src/engine/analytics/` | Trajectories, event statistics, per-branch/workspace metrics |
| Comparison | `src/engine/comparison/` | Branch divergence and variable/event differences |
| Validation | `src/engine/validation/` | Shape/reference checks returning `ValidationResult` |
| Monte Carlo | `src/engine/monte/` | Derived seeds, sequential runner, distribution statistics |

`SimulationEngine` keeps private maps/arrays for `branches`, `snapshots`, `states`, `history`, `logs`, `pending`, and `activatedQueue`. Public getters (`branchesList`, `snapshotsList`, `historyList`, `consoleEntries`) return copies or readonly views; mutating methods are the only supported write path.

## Store shape and ownership

`src/state/store.ts` groups state into four concerns:

| Group | Fields | Owner |
| --- | --- | --- |
| Engine/session | `engine`, `workspace`, `scenarios`, `revision`, `selection` | Store actions call engine methods, then bump `revision` |
| Playback | `isPlaying`, `speed`, `replayStep` | `play`, `pause`, `tick`, `runBatch`, `reset` |
| UI layout | `view`, `panels`, `panelSizes`, `modal`, `commandOpen`, `searchOpen`, `toasts` | View/modal setters and `pushToast()` |
| Preferences | `reducedMotion`, `showGrid`, `compactMode`, `theme`, `graphLayout` | `applySettings()`, toggles, and `usePersistence()` |

The engine object itself is mutable; React sees changes because components subscribe to `revision`. This is why a view that reads `engine.activeBranch.currentState` should also select `revision`.

## Boundary rules

| Boundary | Rule | Enforcement |
| --- | --- | --- |
| Engine → React | Engine never imports React | No `react` imports in `src/engine/` |
| Raw data → store | Validate before entering state | `src/engine/validation/` used by `src/io/import.ts` and `src/persistence/repository.ts` |
| Branch/snapshot → state | Deep-copy, never alias | `deepClone()` in `src/utils/clone.ts` |
| Randomness → engine | Inject `SeededRandom`; no clock seeds | `src/engine/random/rng.ts` |
| Browser APIs → engine | Keep IndexedDB/localStorage/DOM out of engine code | Persistence and IO live in `src/persistence/` and `src/io/` |
| Worker → UI | Validate message shapes | `src/workers/protocol.ts`, `src/engine/monte/workerProtocol.ts` |

## Data-flow cross-checks

```text
Import:  file/paste → parseImportEnvelope → validateEnvelope → createImportPlan
         → registerScenarios / loadScenario → revision++ → views re-render

Persist: usePersistence → loadSettings/saveSettings (localStorage)
         → ParadoxRepository.getScenarios/saveScenario (IndexedDB)
         → store scenarios + activeScenarioId

Run:     TopBar/SimulationControls → store.tick/runBatch → engine.step/run
         → timeline/history/console → revision++ → Lab/Timeline/Analytics/History
```

## Thread model

| Work | Thread | Current UI path |
| --- | --- | --- |
| Engine stepping | Main | `usePlayback()` interval and `SimulationControls` |
| Monte Carlo trials | Main | `MonteView.tsx` chunks of 8 with `setTimeout` yields |
| Worker protocol | Available | `src/workers/monte.worker.ts` + `monteClient.ts`, not used by `MonteView` |
| Rendering | Main | React 18, lazy views, canvas/WebGL in `UniverseView.tsx` |
| Storage | Main | IndexedDB and localStorage via `src/persistence/` |

Further reading: `docs/ENGINE.md` for transition semantics, `docs/UI.md` for the component surface, and `docs/WORKFLOWS.md` for end-to-end interactions.
