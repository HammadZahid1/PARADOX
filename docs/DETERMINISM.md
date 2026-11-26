# Determinism

PARADOX runs entirely in the browser. "Deterministic" here means: for the same scenario definition, seed, ordered inputs, and branch creation order, a run produces the same state fingerprint. It does **not** mean two object graphs are byte-identical, because ids and timestamps intentionally use `Date.now()` and `Math.random()`. For the step pipeline itself, see `docs/ENGINE.md`.

## 1. Seeds and scenario construction

`SimulationConfiguration` (`src/engine/types/core.ts`) holds `seed`, `mode`, `stepDuration`, `maxSteps`, `propagationLimit`, `autoSnapshotSteps`, and `strictValidation`. Presets use `defaultConfiguration()` from `src/engine/scenarios/factory.ts`:

```ts
{ stepDuration: 1, maxSteps: 120, seed: 1337, mode: 'deterministic',
  propagationLimit: 6, autoSnapshotSteps: 10, strictValidation: true }
```

- `createScenario()` fixes `createdAt`, `updatedAt` to `0` and `version` to `1`, copying variables, rules, events, objectives, and tags so preset data is stable. `makeVariable()`, `makeRule()`, and `makeEvent()` supply stable defaults.
- `createInitialState()` (`src/engine/core/state.ts`) derives the state id from `hashString(`${seed}:${variableIds}`)`; `advanceClock()` derives the next id from `state.id`, `step`, and `seed`. Those ids are deterministic.
- `src/utils/seed.ts` offers `normalizeSeed()` (truncate to uint32) and `parseSeed()` for decimal, `0x` hex, UUID, and arbitrary text seeds (FNV-1a). These helpers are available but are not called by the running engine or UI; the active Monte Carlo slider and presets pass numbers directly.
- `generateScenario()` in `src/engine/scenarios/custom.ts` uses a **local** `seedFromText(title|domain|maxSteps)` (FNV-style hash clamped to `1..1_000_000`), so the same form input always generates the same custom scenario.
- `hashString()` and `createId()` live in `src/utils/id.ts`. `hashString()` is a stable FNV-1a uint32; `createId()` mixes `Date.now()`, a counter, and `Math.random()` and must never be used as an equality signal.

## 2. Deterministic mode vs probabilistic mode

`mode` is passed from `SimulationConfiguration` into `EventEngine.processStep()` (`src/engine/events/engine.ts`) and then `evaluateTrigger()` (`src/engine/events/triggers.ts`):

| Mode | Trigger probability | Roll |
| --- | --- | --- |
| `deterministic` | `1` when `event.probability >= 1`, otherwise `0` | Forced to `0` |
| `probabilistic` | `event.probability` | `random.next()` from the seeded generator |

Consequences:

- In `deterministic` mode, events with probability below `1` do not fire from triggers; `probability >= 1` always fires when structural conditions and cooldowns pass.
- `EventEngine.inject()` only rolls probability in `probabilistic` mode; a manual injection in `deterministic` mode always applies its direct effects.
- Deterministic mode does **not** disable randomness: weighted outcomes via `weightedPick()` and seeded effect draws in `src/engine/random/distributions.ts` still consume the seeded stream. The same seed and event order reproduce those draws.
- `scheduleEvents()` (`src/engine/events/scheduler.ts`) evaluates events in array order; `applyRules()` (`src/engine/core/rules.ts`) uses descending rule priority; causal propagation walks `diffVariables()` changes in their returned order. Reordering definitions, rules, or events can change draw consumption and therefore later values.

## 3. RNG streams

`SeededRandom` (`src/engine/random/rng.ts`) is Mulberry32. It exposes `next()`, `int()`, `chance()`, `range()`, `pick()`, `fork(label)`, and state get/set. The engine constructs fresh generators per operation:

```ts
// SimulationEngine.step() — src/engine/simulation/engine.ts
const random = new SeededRandom((branch.seed + Math.imul(stepNumber, 0x9e3779b9)) >>> 0);

// SimulationEngine.injectEvent() — same file
const random = new SeededRandom((branch.seed + Math.imul(branch.currentState.step + 1, 0x85ebca6b)) >>> 0);
```

Per-step seeds therefore depend on the active branch seed and step number, never on wall-clock time. Child branch seeds are assigned in `SimulationEngine.createBranch()` as `(parent.seed + branches.size * 0x9e3779b9) >>> 0`, so **branch creation order and count affect later seeds**.

Additional seed derivation helpers:

- `deriveSeed(baseSeed, runIndex)` in `src/engine/monte/runner.ts` hashes `` `${base}:${index}` `` so Monte Carlo trials are independent of execution order. `MonteView.tsx` first derives a chunk seed from `deriveSeed(baseSeed, offset)` (`CHUNK_SIZE = 8`) and gives each cloned scenario a per-trial `configuration.seed`. Cancellation keeps completed runs; `elapsedMs` uses `performance.now()` and is intentionally run-specific.
- `NamedStreams`, `createStreams()`, and `deriveStreamSeed(masterSeed, name)` in `src/engine/determinism/streams.ts` provide named, order-independent streams with a fresh generator per `create()` call. They are pure helpers covered by `streams.test.ts`; `SimulationEngine` does not currently call them.
- `stepSeed(masterSeed, step)` in `src/engine/determinism/replay.ts` is a replay-specific hash and is **not** the same derivation used by `SimulationEngine.step()`.
- `fork(label)` on `SeededRandom` XORs the current state with `hashString(label)`; it is available but not part of the normal step pipeline.

## 4. State fingerprints and checksums

`stateFingerprint()` / `statesEqual()` in `src/engine/core/state.ts` are the canonical comparison for runs. The fingerprint is canonical JSON containing `step`, `time`, `seed`, variables sorted by id, metrics sorted by key, sorted active event ids, and fired events as `eventId@step`. It deliberately excludes `id`, `version`, `parentId`, `parameters`, and `changes`; use it for step equivalence, not as a complete object identity proof.

`src/engine/determinism/checksum.ts` adds:

| Function | Behavior |
| --- | --- |
| `stableStringify(value)` | Canonical JSON with sorted object keys and preserved array order; throws on circular values. |
| `valueChecksum(value)` | FNV-1a hash of `stableStringify(value)`. |
| `stateChecksum(state)` | FNV-1a hash of `stateFingerprint(state)`. |
| `fnv1a(input)` | Delegates to `hashString()` in `src/utils/id.ts`, keeping one hash implementation. |

`compareBranches()` (`src/engine/comparison/compare.ts`) uses `stateFingerprint()` to find the first divergent step between two realities.

Why raw JSON equality fails: `createId()` and snapshot/history timestamps use `Date.now()`/`Math.random()` (`src/utils/id.ts`, `src/engine/timeline/snapshots.ts`, `src/engine/simulation/engine.ts`). Compare fingerprints or checksums instead.

Adjacent helpers in `src/engine/determinism/`:

- `validateSerializable()` / `guardStateTransition()` (`guard.ts`) reject unsupported values (functions, symbols, bigints, cycles, and unexpected `undefined`) before a state crosses a transition boundary; declared optional state fields are allowed.
- `TelemetryCollector`, `mergeTelemetry()`, and `serializeTelemetry()` (`telemetry.ts`) produce stable counts via `stableStringify()`.
- `IdleDetector.observeState()` (`idle.ts`) feeds `stateChecksum()` into a patience window.
- `StepBudget` and `runWithinBudget()` (`budget.ts`) bound `SimulationEngine.run()` with cooperative cancellation.

These helpers are tested alongside their files; no UI view calls them directly in this revision.

## 5. Replay: two different APIs

### Input replay (`src/engine/determinism/`)

`StepInput` (`inputs.ts`) is a tagged union of `seed`, `inject`, and `adjust` entries, each bound to a positive integer `step`. `createInputLog()`, `add()`, `atStep()`, `filterByKind()`, `encodeJSON()`, and `decodeJSON()` provide immutable log operations; `decodeJSON()` rejects unknown kinds and malformed fields.

```ts
// src/engine/determinism/replay.ts
const recording = recordReplay(seed, inputs, maxSteps);
const { state, frames } = playback(recording, initialState, handlers);
```

`recordReplay()` validates and sorts inputs by step without mutating the caller's array. `playback()` then, for each step: applies `seed` inputs (changing the master seed), applies injections/adjustments using `stepSeed(masterSeed, step)`, calls `handlers.step()`, and records a `ReplayFrame` with the step, seed, state, and inputs. `ReplayHandlers` must be pure state transitions; `replay.test.ts` asserts repeated playback matches and leaves the source state unchanged. This API is not wired into the UI.

### Timeline inspection (`src/engine/timeline/replay.ts`)

`buildReplayFrames(timeline, states)`, `replayAtStep()`, and `replayDuration()` build a read-only view from recorded timeline entries and available states. The **Replay position** slider in `src/ui/views/TimelineView.tsx` extends the chart domain; it does not rewind the engine. `stepBackward()` in `src/state/store.ts` finds the latest snapshot at or before the target step and calls `restoreSnapshot()`; it is not a delta replay.

## 6. Branch isolation

- `createReality()` (`src/engine/reality/branch.ts`) deep-clones the source `WorldState` with `cloneState()`, creates an independent timeline, records `parentId`, `branchPointStep`, `divergenceEventId`, and `divergenceReason`, and stamps the branch with the supplied seed.
- `branchFromState(parent, state, name, reason, eventId)` never mutates the parent. `branchFromSnapshot()` restores a snapshot state first; `branchFromEvent()` derives the fork step/time from a recorded event.
- `SimulationEngine.createBranch()` accepts a snapshot id, forks from current or restored state, assigns a distinct seed/color, and registers states under `<branchId>:<step>` in its private `states` map. `getStateAt()` falls back to the closest earlier checkpoint.
- `selectBranch()` only changes `activeBranchId`. `restoreSnapshot()` replaces only the active branch's current state; `restoreState()` gives the restored state a new id and increments `version`, so compare fingerprints rather than ids.
- `branchTree()` / `branchAncestry()` power `src/ui/views/ExplorerView.tsx` and `UniverseView.tsx`. `compareBranches()` reports variable deltas, trajectories, event sets, and divergence step.
- `SimulationEngine.reset()` recreates a single prime branch and clears branches, snapshots, states, history, and pending propagations.

## 7. Verification recipe

```ts
import { createScenario, makeVariable } from '@/engine/scenarios/factory';
import { SimulationEngine } from '@/engine/simulation/engine';
import { statesEqual } from '@/engine/core/state';

const scenario = createScenario({
  id: 'test.determinism',
  name: 'Determinism',
  description: 'Two runs with the same seed',
  domain: 'test',
  variables: [makeVariable({ id: 'v', key: 'v', name: 'V', type: 'number', initial: 0 })],
});

const first = new SimulationEngine(scenario);
const second = new SimulationEngine(scenario);
first.run(40);
second.run(40);
// statesEqual(first.activeBranch.currentState, second.activeBranch.currentState) === true
```

For a defect report, record the scenario id, seed, mode, steps and branch creation order, then attach observed and expected `stateFingerprint()` strings (see the **Engine defect** issue template). Do not attach raw object dumps as proof.

## 8. Known limits

| Limit | Evidence |
| --- | --- |
| Objects are not byte-identical across runs | `createId()` and timestamps in `src/utils/id.ts` and `src/engine/timeline/snapshots.ts` |
| Named streams, input replay, telemetry, idle detection, and budgets are unwired | Only colocated `src/engine/determinism/*.test.ts` files import them; no view or `SimulationEngine` call sites |
| Monte Carlo UI runs on the main thread | `src/ui/views/MonteView.tsx` does not call `startMonteWorker()` from `src/workers/monteClient.ts` |
| Runs are not restored on reload | `src/ui/hooks/usePersistence.ts` hydrates settings and custom scenarios only |
| Full-state serializability is not auto-enforced | `guardStateTransition()` exists but is not invoked by `SimulationEngine.step()` |
