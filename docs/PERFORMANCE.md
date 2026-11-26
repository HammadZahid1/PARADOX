# Performance

PARADOX runs in one browser tab. This page records the actual hot paths, allocation behavior, and current offloading status so performance work can be targeted rather than guessed. Numbers here are structural observations, not benchmark results; no benchmark suite exists in this repository.

## Simulation hot path

`SimulationEngine.step()` (`src/engine/simulation/engine.ts`) runs synchronously:

```text
advanceClock → applyRules → scheduleEvents/applyEventEffects
             → applyPendingPropagations → propagateChange per numeric delta
             → appendTimelineEntry → history/console logging
```

Cost characteristics:

| Operation | File | Cost note |
| --- | --- | --- |
| `advanceClock()` | `src/engine/core/state.ts` | Shallow-copies variables, parameters, metrics, active events, and history array each step |
| `applyRules()` | `src/engine/core/rules.ts` | Copies and sorts rules on every step; evaluates all conditions |
| `scheduleEvents()` | `src/engine/events/scheduler.ts` | Iterates all events every step; checks cooldown via `state.eventHistory` filter |
| `propagateChange()` | `src/engine/causal/propagation.ts` | Breadth-first over all enabled edges per changed variable; bounded by `propagationLimit` and `visited` |
| `appendTimelineEntry()` | `src/engine/timeline/timeline.ts` | Rebuilds and sorts the entire `entries` array on each step |
| `this.states.set()` | `src/engine/simulation/engine.ts` | Retains a `WorldState` per branch/step; `getStateAt()` linearly scans keys |
| Console logging | `src/engine/simulation/engine.ts` | Capped at `consoleCapacity` (default 500) via `slice(-capacity)` |
| History | `src/engine/simulation/engine.ts` | Unbounded `HistoryEntry[]` for the engine lifetime |

The timeline append and full state retention mean long runs (hundreds of steps, many branches) grow memory and per-step work. `config.autoSnapshotSteps` defaults to 10 for presets, so automatic snapshots also add full state copies at those steps.

### Cost variables

Use these symbols when reasoning about a step; none are cached across steps in the current implementation.

| Symbol | Meaning | Where it appears |
| --- | --- | --- |
| `V` | variable definitions | `applyRules()`, `diffVariables()`, propagation lookups |
| `R` | enabled rules | `applyRules()` sorts by priority and evaluates conditions |
| `E` | event definitions | `scheduleEvents()` evaluates one trigger per event |
| `F` | recorded event history | `cooldownActive()` filters `state.eventHistory` |
| `G` | causal graph edges/nodes | `propagateChange()` scans edges in a bounded BFS |
| `L` | timeline entries | `appendTimelineEntry()` rebuilds and sorts entries |
| `K` | branches | `states` and `branches` maps grow per branch |
| `T` | completed steps | `states` retains one `WorldState` per branch/step |

Approximate per-step costs are `O(V + R log R + E * F + G + L log L)` before snapshots and console logging. `getStateAt()` is `O(K * T)` when there is no exact key; the common exact lookup is `O(1)`. These are structural bounds, not measured timings.

State retention is intentionally simple: every successful `SimulationEngine.step()` writes `states.set(`${branchId}:${step}`, state)` (`src/engine/simulation/engine.ts`). `restoreSnapshot()` replaces only the active branch's `currentState`; it does not prune the retained state map. `reset()` clears branches, snapshots, history, pending propagation, and states before recreating Prime Reality.

## RNG and cloning

`SeededRandom` (`src/engine/random/rng.ts`) is O(1) per draw and is re-created per step; it is not a bottleneck. The seed is derived as `(branch.seed + Math.imul(stepNumber, 0x9e3779b9)) >>> 0` inside `SimulationEngine.step()`, so the same branch seed and step index reproduce the same draws. In `deterministic` mode the scheduler coerces selection to certainty; probabilistic mode consumes draws from this generator. See `docs/ENGINE.md` for the semantic rules.

`deepClone()` (`src/utils/clone.ts`) uses `structuredClone` with a JSON fallback and is used for branch creation, snapshot restore, repository writes, and factory cloning. Branch creation therefore costs a full state clone, which is acceptable for interactive branching but should be measured before increasing branch counts substantially. `createBranch()` also stores a clone at the base step and derives a child seed from `branches.size`, so branch order affects later randomness.

Derived variables are recomputed by `recomputeDerived()` during state preparation; malformed expressions are caught and ignored rather than aborting the step. Expression parsing itself is a hand-written parser in `src/engine/core/expression.ts`, so no dynamic code compilation is involved.

## Monte Carlo execution

Two layers exist:

1. **Library layer** — `src/engine/monte/runner.ts` runs trials sequentially with `deriveSeed(baseSeed, runIndex)` and preserves completed runs on cancellation. `src/engine/monte/statistics.ts` builds 12-bin histograms and percentiles. `src/workers/monte.worker.ts` creates a fresh `SimulationEngine` per trial, posts `monte:progress`/`monte:result`/`monte:error`, and checks a cancellation set per request id. `src/workers/monteClient.ts` starts a module worker and terminates it on completion/error.
2. **UI layer** — `src/ui/views/MonteView.tsx` currently runs **on the main thread** in chunks of `CHUNK_SIZE = 8`, yielding with `window.setTimeout(..., 0)` between chunks. It creates isolated engines from a cloned scenario and does not call `startMonteWorker()`. Trial limits in the UI are 10–200 runs and 5–120 steps.

Because the worker is not wired into `MonteView`, a batch still performs engine work on the UI thread. The chunking keeps the browser responsive between chunks but does not parallelize computation.

The library boundary is still usable from custom integrations. `createMonteRunRequest()` in `src/workers/protocol.ts` wraps `{ requestId, request, scenario }`; `startMonteWorker()` in `src/workers/monteClient.ts` creates a module worker, validates replies with `isMonteWorkerMessage()`, and terminates it on `monte:result`, `monte:error`, or worker `error`. `src/workers/monte.worker.ts` guards inbound `monte:run`/`monte:cancel` messages, builds one `SimulationEngine` per trial, and posts `monte:progress` updates. Cancellation is a `Set<string>` of request ids, so an outstanding batch can stop between trials. Completed trials are preserved in `MonteCarloResult.runs` even when `cancelled` is true.

Each Monte Carlo trial clones the scenario only at the configuration/seed level in the UI path, then constructs its own engine; the active workspace engine is never stepped by the batch. `deriveSeed(baseSeed, index)` in `src/engine/monte/runner.ts` makes trial seeds order-independent within a family. The UI adds a second derivation (`deriveSeed(chunkBaseSeed, runIndex)`) so chunk boundaries do not change results.

## UI rendering

- `src/state/store.ts` increments a single `revision` counter on engine mutations. Views subscribe to `revision` to re-render; this is simple but broad.
- `src/ui/ViewRouter.tsx` lazy-loads each view, so the 3D stack is not loaded for non-3D views.
- `vite.config.ts` splits large dependencies into `three`, `d3`, and `react` chunks and sets `chunkSizeWarningLimit: 900`.
- `src/ui/components/EventConsole.tsx` filters console entries with `useMemo`; `src/ui/components/SearchDialog.tsx` rebuilds the local search index on `[scenarios, engine, revision]`.
- `src/ui/views/UniverseView.tsx` uses `useMemo` for geometry buffers and `Float32Array` for point clouds/links.
- `src/ui/components/StatusBar.tsx` reads branch name, variable count, event count, revision, seed, and engine status on every render; it is a cheap diagnostic for whether a mutation reached the store.
- `src/state/store.ts` keeps the last five toasts via `slice(-5)` and caps panel sizes to `180–520` pixels; these are small bounded UI collections.
- There is no table virtualization, incremental derived-variable cache, or telemetry hook despite the corresponding roadmap items.

## Persistence cost

`ParadoxRepository` (`src/persistence/repository.ts`) validates and deep-clones every value before writing to IndexedDB via `src/persistence/db.ts`. Each helper opens and closes its own database connection, so bulk writes are not batched. `src/persistence/settings.ts` writes a small JSON blob to `localStorage` key `paradox:settings`. `estimateStorageUsage()` (`src/persistence/usage.ts`) uses `navigator.storage.estimate()` when available and falls back to a UTF-16 byte count of localStorage.

The UI shell invokes these through `src/ui/hooks/usePersistence.ts`: settings are written on preference changes and the active scenario is written when `scenarios` or `workspace.activeScenarioId` changes. There is no bulk workspace/history autosave; see `docs/ARCHITECTURE.md` for wiring scope.

## Profiling checklist

No benchmark harness is configured, so start with the browser Performance panel and React DevTools on `npm run dev`:

1. Record a `runBatch(steps)` call from `src/state/store.ts` and confirm time is spent inside `SimulationEngine.step()`, not in React rendering.
2. Vary one input at a time: rules, events, causal edges, steps, or branch count. The cost table above predicts which path should change.
3. Watch retained heap after repeated `reset()` cycles; engine instances are replaced by `loadScenario()`, while `reset()` clears maps on the existing engine.
4. For Monte Carlo, compare the 8-trial UI chunks with a direct `startMonteWorker()` call before claiming a worker regression.
5. Confirm `npm run build` still passes; `vite.config.ts` chunk splitting is part of the load-time profile.

## Practical guidance

- Keep `maxSteps` modest for interactive runs; 120 is the preset default (`src/engine/scenarios/factory.ts`).
- Keep `propagationLimit` low (preset default 6). Each changed numeric variable can trigger its own bounded BFS.
- Prefer snapshots over retaining every intermediate state externally; `getStateAt()` already falls back to the closest earlier recorded state.
- For large Monte Carlo studies, use `src/workers/monteClient.ts` from a custom integration until `src/ui/views/MonteView.tsx` is updated to use it.
- Avoid calling `engine.run()` from a render path; use store actions (`runBatch`, `tick`) so revision updates stay consistent.
- When adding charts, reuse `Sparkline`, `LineChart`, `Histogram`, and `VariableTable` in `src/ui/components/` rather than rebuilding data transforms per frame.
- Check `REV` in `src/ui/components/StatusBar.tsx` when diagnosing a view that does not update: every store action that mutates the engine increments `revision`, while pure view changes such as `setView()` do not.
- Keep console queries bounded with `consoleCapacity` (`SimulationEngineOptions`) when embedding an engine in a long-running custom integration; the default is 500 entries.
- If exact historical lookup is needed often, maintain an external index rather than repeatedly calling `getStateAt()` for missing steps; its fallback path scans and sorts retained state keys.
- Profile before adding caches: the current engine already shares a single `revision` signal and clones only at explicit branch, snapshot, and persistence boundaries.
