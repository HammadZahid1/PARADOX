# Simulation Engine

The engine is a deterministic, in-browser state-transition system. It lives under `src/engine/`, with orchestration in `src/engine/simulation/engine.ts` and shared shapes in `src/engine/types/`. Models are simplified fictional teaching tools; they are not calibrated predictors of climate, economics, or geopolitics.

## Core types

| Type | Path | Notes |
| --- | --- | --- |
| `WorldState` | `src/engine/types/world.ts` | `time`, `step`, `variables`, `parameters`, active events, history, metrics, `seed`, `version`, changes |
| `VariableDefinition` | `src/engine/types/core.ts` | `id`, `key`, `name`, `type`, `initial`, optional bounds, constraints, expression |
| `SimulationConfiguration` | `src/engine/types/core.ts` | `stepDuration`, `maxSteps`, `seed`, `mode`, `propagationLimit`, `autoSnapshotSteps`, `strictValidation` |
| `Scenario` | `src/engine/types/scenario.ts` | Variables, parameters, rules, events, optional causal graph, config, objectives, disclaimer |
| `EventTrigger` / `EventEffect` / `SimulationEvent` | `src/engine/types/events.ts` | Trigger kinds and effect algebra; outcomes are weighted |
| `CausalGraph` / `CausalRelationship` | `src/engine/types/causal.ts` | Typed edges with signed `strength`, condition, `delaySteps` |
| `RealityBranch` | `src/engine/types/reality.ts` | Parent link, fork step, initial/current state, timeline, seed, decisions |
| `Timeline` / `TimelineSnapshot` | `src/engine/types/timeline.ts` | Entries, snapshots, event records |
| `StepResult` / `ConsoleEntry` | `src/engine/simulation/types.ts` | Return value of `step()` and console log shape |

## Step pipeline in detail

`SimulationEngine.step()` (`src/engine/simulation/engine.ts`):

```ts
const stepNumber = branch.currentState.step + 1;
const random = new SeededRandom((branch.seed + Math.imul(stepNumber, 0x9e3779b9)) >>> 0);
const advanced = advanceClock(branch.currentState, config.stepDuration);
const ruled = applyRules(advanced, this.scenario.rules, this.definitions, 'step');
const eventResult = this.eventEngine.processStep(
  ruled.state, effectiveEvents, this.definitions, random, stepNumber, config.mode,
);
```

Then, in order:

1. `applyPendingPropagations()` applies delayed edges whose `dueStep <= state.step`.
2. If `config.propagationLimit > 0`, each numeric delta from `diffVariables()` feeds `propagateChange()`.
3. Metrics `totalChanges` and `activeEvents` are refreshed.
4. `appendTimelineEntry()` writes a frame; `autoSnapshotSteps` triggers an automatic snapshot.
5. `recordHistory()` and `log()` append to engine-local arrays; console capacity defaults to 500.

`run(steps, onProgress?, shouldCancel?)` loops steps and stops early when `shouldCancel()` returns true. `injectEvent()` and `adjustVariable()` are immediate, out-of-band transitions applied to the active branch; they also propagate causal effects.

## Rules

`applyRules()` (`src/engine/core/rules.ts`) filters enabled rules and sorts by **descending priority**. Each rule's `condition` plus `conditions` must all pass via `evaluateCondition()` (`src/engine/core/variables.ts`). Effects use `applyArithmeticEffect()` supporting `increase`, `decrease`, `assign`, `multiply`, `percentChange`, and `temporary`. Numeric values are coerced, clamped to `min`/`max`, rounded to 6 decimals, and optionally rounded to integers. Derived variables can be recomputed with `recomputeDerived()` using the small arithmetic parser in `src/engine/core/expression.ts` (no `eval`).

Note: the normal `step()` pipeline applies rules and effects; `recomputeDerived()` is a separate helper, not automatically called on each step.

## Events

`EventEngine.processStep()` (`src/engine/events/engine.ts`) calls `scheduleEvents()` (`src/engine/events/scheduler.ts`), which checks cooldowns and `evaluateTrigger()` (`src/engine/events/triggers.ts`) for each event. Supported trigger kinds: `manual`, `scheduled`, `threshold`, `boolean`, `probability`, `dependency`, `recurring`, `cascade`. Effects are applied by `applyEventEffects()` (`src/engine/events/effects.ts`), including weighted `outcomes`, conditional effects, temporary deltas with later reversal, `activate`, `cancel`, and `log`. `expireTemporaryEffects()` reverts temporary deltas at `revertAtStep`.

`EventQueue` (`src/engine/events/queue.ts`) orders by scheduled step, then higher priority, then event id. `SimulationEngine` additionally maintains `activatedQueue` so activated events fire on the next step.

### Deterministic vs probabilistic mode

`mode` lives in `SimulationConfiguration`:

- **`deterministic`**: trigger probability is `1` when `event.probability >= 1`, otherwise `0`; the roll is forced to `0`. Events with probability below 1 never fire.
- **`probabilistic`**: the trigger uses `event.probability` and `random.next()` for the roll.

Weighted outcome selection (`weightedPick`, `src/engine/random/distributions.ts`) always draws from the seeded RNG, so it remains reproducible for a fixed seed and event order. Manual injection in `EventEngine.inject()` only rolls probability in probabilistic mode.

## RNG and reproducibility

`SeededRandom` (`src/engine/random/rng.ts`) implements Mulberry32 with `next`, `int`, `chance`, `range`, `pick`, `fork(label)`, and state get/set. `fork()` derives an independent stream by XOR-ing the state with `hashString(label)`.

Reproducibility is seed- and order-dependent:

- Prime branch seed = `scenario.configuration.seed`.
- Child branch seed in `SimulationEngine.createBranch()` = `(parent.seed + branches.size * 0x9e3779b9) >>> 0`.
- Per-step RNG = `(branch.seed + Math.imul(stepNumber, 0x9e3779b9)) >>> 0`.
- Injection RNG uses `0x85ebca6b` instead of the step multiplier.

`stateFingerprint()` / `statesEqual()` (`src/engine/core/state.ts`) compare step, time, seed, sorted variables, sorted metrics, active event ids, and fired event ids.  
**Caution:** `createId()` (`src/utils/id.ts`) and snapshot/history timestamps use `Date.now()` and `Math.random()`, so whole objects are not byte-identical across runs. Use fingerprints instead of raw JSON equality.

## Causal propagation limits

`propagateChange()` (`src/engine/causal/propagation.ts`) walks enabled edges breadth-first:

- Relation modifiers: `causes`/`influences`/`enables`/`depends-on` ×1, `amplifies` ×1.5, `reduces` ×-1, `prevents` ×-0.75.
- `correlates-with` and `custom` are descriptive and are skipped.
- A `visited` set prevents revisiting nodes; `depth >= limit` stops that branch and sets `cycleArrested`.
- Edges with `delaySteps > 0` become `PendingPropagation` entries, applied by `applyPendingPropagations()` on or after the due step.
- Edge conditions are evaluated before propagation.

`limit` comes from `config.propagationLimit` (preset default 6 in `src/engine/scenarios/factory.ts`; migration default 100 in `src/persistence/migration.ts`; `propagateChange()`'s own default is 8). `buildGraphFromDefinitions()` (`src/engine/causal/graph.ts`) creates variable/event nodes and `causes` edges from event effects; no correlations are inferred.

## Branches, snapshots, and history

- `createReality()` deep-clones initial state and creates a timeline (`src/engine/reality/branch.ts`).
- `SimulationEngine.createBranch(name, fromSnapshotId?, reason?, eventId?)` forks from current or restored snapshot state; the UI dialog is `src/ui/modals/NewBranchModal.tsx`.
- `captureSnapshot()` / `restoreSnapshot()` use `src/engine/timeline/snapshots.ts`; restore changes only the active branch's current state.
- `branchTree()` / `branchAncestry()` power the explorer and universe views.
- `src/engine/analytics/` builds trajectories and metrics; `src/engine/comparison/compare.ts` compares branches via fingerprints and variable deltas.

## Validation

`src/engine/validation/` exports validators for scenarios, worlds, variables, events, graphs, and import envelopes. Results use `{ valid, issues }` with `ValidationIssue = { path, message, severity }`. `validateScenario()` checks required ids, variable sets, event payloads, positive step config, finite seed, optional graph, and objective references.

## Trigger kinds at a glance

From `src/engine/events/triggers.ts`; structural readiness is checked before conditions and probability:

| Kind | Structural requirement |
| --- | --- |
| `manual` | Never scheduled by `processStep`; use injection |
| `scheduled` | Current `step === atStep`, plus `atTime` when provided |
| `threshold` | Variable compared with `operator` and `value` |
| `boolean` | Variable equals `expected` |
| `probability` | `perStep` or `step === 0` |
| `dependency` | All referenced event ids fired, unless `requireAll === false` |
| `recurring` | `step >= startStep`, interval aligned, under `maxOccurrences` |
| `cascade` | Parent event fired and `step >= delaySteps` |

`cooldownActive()` checks the last fired record before scheduling. Disabled events return `reason: 'disabled'`; unmet conditions return `reason: 'conditions-unmet'`.

## Effect kinds at a glance

`applyEventEffects()` in `src/engine/events/effects.ts` and arithmetic helpers in `src/engine/core/variables.ts` support:

| Effect | Behavior |
| --- | --- |
| `increase` / `decrease` | Add/subtract a numeric amount |
| `assign` | Set a scalar value |
| `multiply` | Scale by a factor |
| `percentChange` | Apply a signed percentage |
| `temporary` | Apply a delta and revert at `revertAtStep` |
| `activate` / `cancel` | Queue event state changes via `EventProcessingResult` |
| `log` | Append text to event result logs |
| `conditional` | Branch on a condition with optional `otherwise` |

Weighted `outcomes` are drawn with `weightedPick()` from `src/engine/random/distributions.ts`, then their effects are applied through the same path.

## Engine-owned collections

| Collection | Type | Lifetime/behavior |
| --- | --- | --- |
| `branches` | `Map<EntityId, RealityBranch>` | One prime branch plus forks; `selectBranch()` switches `activeBranchId` |
| `snapshots` | `Map<EntityId, TimelineSnapshot>` | Full `WorldState` copies; `deleteSnapshot()` removes one |
| `states` | `Map<string, WorldState>` | Keyed `<branchId>:<step>`; `getStateAt()` falls back to the closest earlier step |
| `history` | `HistoryEntry[]` | Append-only for the engine lifetime |
| `logs` | `ConsoleEntry[]` | Capped by `consoleCapacity`, default 500 |
| `pending` | `PendingPropagation[]` | Delayed causal transfers, filtered after application |
| `activatedQueue` | `EntityId[]` | Events deferred to the next step |

`reset()` recreates the prime branch and clears all seven collections except the fresh log entry.

## Out-of-band transitions

| Method | Changes current state? | Appends timeline? | Propagates causally? |
| --- | --- | --- | --- |
| `step()` | Yes, next step | Yes | Yes |
| `injectEvent()` | Yes, same step | Yes | Yes |
| `adjustVariable()` | Yes, same step | No | Yes |
| `captureSnapshot()` | No | Adds snapshot to branch timeline | No |
| `restoreSnapshot()` | Yes, overwrites active current state | No | No |
| `createBranch()` | No, creates a child | Seeds child timeline | No |

These distinctions matter when interpreting UI views: `WorldView.tsx` slider changes are recorded in history but not as new timeline entries, while event injection is.
