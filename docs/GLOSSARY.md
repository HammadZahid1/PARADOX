# Glossary

Terms as used by the code in this repository.

| Term | Meaning | Primary path |
| --- | --- | --- |
| Active event / `ActiveEventInstance` | A running temporary effect with start/revert steps, shown in world state | `src/engine/types/world.ts` |
| App settings / `AppSettings` | Local presentation preferences stored under `paradox:settings` | `src/persistence/settings.ts` |
| Branch / `RealityBranch` | An isolated timeline with its own state, seed, parent link, and decisions | `src/engine/types/reality.ts` |
| Branch isolation | The guarantee that forking deep-clones state so child steps cannot mutate the parent | `src/engine/reality/branch.ts` |
| Causal edge / `CausalRelationship` | Directed link with type, signed strength, condition, and optional delay | `src/engine/types/causal.ts` |
| Causal graph / `CausalGraph` | Nodes and edges used for immediate and delayed propagation | `src/engine/types/causal.ts` |
| Causal propagation | Bounded breadth-first transfer of numeric deltas along non-descriptive edges | `src/engine/causal/propagation.ts` |
| `cycleArrested` | Flag set when propagation stops at a depth limit | `src/engine/causal/propagation.ts` |
| Condition | A variable/operator/value predicate used by rules, events, and edges | `src/engine/types/events.ts` |
| Configuration / `SimulationConfiguration` | Step duration, max steps, seed, mode, propagation limit, snapshot cadence, validation flag | `src/engine/types/core.ts` |
| Console entry | Engine log line with kind, severity, branch id, step, and time | `src/engine/simulation/types.ts` |
| Correlation edge | `correlates-with`; descriptive only, never mutates state | `src/engine/causal/propagation.ts` |
| Decision / `DecisionRecord` | Recorded alternative selection at a step, optionally forked into a branch | `src/engine/reality/decisions.ts` |
| Delta / `VariableChange` | One variable's `from`/`to` change at a step/time with a source label | `src/engine/types/core.ts` |
| Derived variable | Variable with an arithmetic `expression`, recomputed by `recomputeDerived()` | `src/engine/core/variables.ts`, `src/engine/core/expression.ts` |
| Divergence | First step where two branch states or variable trajectories differ | `src/engine/comparison/compare.ts` |
| Envelope / `ImportEnvelope` | `{ format, version, payload }` wrapper for exported JSON | `src/engine/validation/import.ts` |
| Event / `SimulationEvent` | Definition with trigger, probability, conditions, effects, and outcomes | `src/engine/types/events.ts` |
| Event effect / `EventEffect` | Arithmetic, conditional, temporary, activate/cancel, or log instruction | `src/engine/types/events.ts` |
| Event trigger / `EventTrigger` | Manual, scheduled, threshold, boolean, probability, dependency, recurring, or cascade cause | `src/engine/types/events.ts` |
| Fingerprint / `stateFingerprint()` | Canonical string used for reproducible state comparison | `src/engine/core/state.ts` |
| Generated scenario | Deterministic local-template scenario from user-supplied conditions and event names | `src/engine/scenarios/custom.ts` |
| History entry | High-level record of steps, events, snapshots, branches, and restorations | `src/engine/types/timeline.ts` |
| Injection | Immediate application of an event to the active branch, bypassing trigger scheduling | `src/engine/events/engine.ts` |
| Local-first | All computation and data live in the browser; no backend or account required | `src/ui/views/SettingsView.tsx` |
| Manual snapshot | User-created full `WorldState` copy; automatic snapshots are created by cadence | `src/engine/timeline/snapshots.ts` |
| Metrics | Per-branch aggregate counts and final values from `computeRealityMetrics()` | `src/engine/analytics/metrics.ts` |
| Mode: deterministic | Probability below 1 never fires; roll forced to 0 | `src/engine/events/triggers.ts` |
| Mode: probabilistic | Trigger uses `event.probability` and a seeded random roll | `src/engine/events/triggers.ts` |
| Monte Carlo | Batch of isolated engine trials with derived seeds and outcome statistics | `src/engine/monte/runner.ts` |
| Outcome / `EventOutcome` | Weighted alternative effect set on an event | `src/engine/types/events.ts` |
| Parameter | Scenario-level scalar available on `WorldState.parameters` | `src/engine/types/core.ts` |
| Pending propagation | Delayed causal transfer scheduled for a future step | `src/engine/causal/propagation.ts` |
| Preset | Built-in deterministic scenario registered in `SCENARIO_PRESETS` | `src/engine/scenarios/index.ts` |
| Prime Reality | The initial branch created by `SimulationEngine` for a scenario | `src/engine/simulation/engine.ts` |
| Propagation limit | Max causal depth per change; `configuration.propagationLimit` | `src/engine/types/core.ts` |
| Repository / `ParadoxRepository` | Validating, cloning record-store wrapper over IndexedDB or a storage adapter | `src/persistence/repository.ts` |
| Rule / `SimulationRule` | Conditioned, priority-ordered arithmetic change applied each step | `src/engine/types/scenario.ts` |
| Scalar value | `number`, `boolean`, or `string` | `src/engine/types/core.ts` |
| Scenario / `Scenario` | Complete local model: variables, parameters, rules, events, config, objectives | `src/engine/types/scenario.ts` |
| Seed | Integer root for `SeededRandom`; branch and trial seeds are derived from it | `src/engine/random/rng.ts` |
| `SeededRandom` | Mulberry32 PRNG with `next`, `int`, `chance`, `range`, `pick`, `fork` | `src/engine/random/rng.ts` |
| Snapshot / `TimelineSnapshot` | Full state copy at a step, tagged manual/auto/branch/decision | `src/engine/types/timeline.ts` |
| State / `WorldState` | Mutable-at-engine, immutable-at-transition record of one simulation moment | `src/engine/types/world.ts` |
| Step | One engine transition: rules → events → causal propagation → timeline record | `src/engine/simulation/engine.ts` |
| `StepResult` | State, changes, fired events, propagation steps, branch id, optional snapshot id | `src/engine/simulation/types.ts` |
| Step duration | Simulation time added per step (`configuration.stepDuration`) | `src/engine/types/core.ts` |
| Timeline / `Timeline` | Step entries, snapshots, and fired event records for a branch | `src/engine/types/timeline.ts` |
| Toast | Short-lived UI notification stored in Zustand (`ToastMessage`) | `src/state/types.ts` |
| Validation result | `{ valid, issues }` with path/message/severity entries | `src/engine/validation/common.ts` |
| Variable id vs key | `id` indexes state storage; `key` is used by rules, events, and expressions | `src/engine/types/core.ts` |
| View / `ViewId` | Lazy-loaded UI screen id registered in `ViewRouter` | `src/state/types.ts` |
| Workspace | Local identity, scenario ids, and settings stored in the Zustand store | `src/state/store.ts`, `src/engine/types/workspace.ts` |

## Workflow and UI terms

| Term | Meaning | Primary path |
| --- | --- | --- |
| Active branch | Branch selected by `activeBranchId`; the only branch stepped by `tick()` | `src/engine/simulation/engine.ts` |
| Batch | A sequential set of steps from `engine.run()` or a Monte Carlo run | `src/engine/simulation/engine.ts`, `src/engine/monte/runner.ts` |
| Branch seed | Child seed derived from `parent.seed + branches.size * 0x9e3779b9` | `src/engine/simulation/engine.ts` |
| Chunk | `MonteView`'s group of 8 trials separated by `setTimeout` yields | `src/ui/views/MonteView.tsx` |
| Command | Palette entry with `id`, `label`, `group`, optional `shortcut`, and `run()` | `src/ui/commands.ts` |
| Divergence source | Current live state or a selected snapshot used as a fork base | `src/ui/modals/NewBranchModal.tsx` |
| Event anchor | `eventId` carried into the branch dialog to mark a divergence event | `src/ui/modals/NewBranchModal.tsx` |
| Fast forward | Lab control calling `runBatch(10)` | `src/ui/components/SimulationControls.tsx` |
| Focus right | Compare action that changes selection only, not the active branch | `src/ui/views/CompareView.tsx` |
| Graph layout | Store preference for causal rendering: hierarchical/radial/circular/force | `src/state/store.ts` |
| Inspection selection | `selection.branchId` / `selection.variableKey` / `selection.eventId` shared by views | `src/state/store.ts` |
| Modal kind | Discriminator used by `ModalHost` to choose a dialog | `src/ui/modals/ModalHost.tsx` |
| Panel size | Store-held width for navigator, inspector, console, and controls | `src/state/store.ts` |
| Replay frame | Timeline-derived summary shown by `HistoryView` via `buildReplayFrames()` | `src/engine/timeline/replay.ts` |
| Revision | Store counter incremented on engine mutations to trigger React re-renders | `src/state/store.ts` |
| Sample every | Monte Carlo sampling interval derived from `maxSteps / 20` | `src/ui/views/MonteView.tsx` |
| Scrubber | Timeline view's local replay-position slider; does not rewind the engine | `src/ui/views/TimelineView.tsx` |
| Search index | Locally built documents over scenarios, variables, events, rules, and branches | `src/search/` |
| Settings mirror | `usePersistence()` effect writing Zustand preferences to `localStorage` | `src/ui/hooks/usePersistence.ts` |
| Status bar | Footer showing branch, variables, events, revision, seed, and engine status | `src/ui/components/StatusBar.tsx` |
| Store action | Zustand function in `useParadox` that wraps engine mutation and revision bump | `src/state/store.ts` |
| Trial seed | Derived seed for one isolated Monte Carlo engine | `src/engine/monte/runner.ts` |
| Validation issue | `{ path, message, severity }` entry returned by validators | `src/engine/validation/common.ts` |
| View id | Lazy-loaded screen key mapped in `ViewRouter` | `src/ui/ViewRouter.tsx` |

## Term relationships

```text
Scenario → SimulationEngine → Prime Reality (branch)
                                ├─ step() → timeline entry → replay frame
                                ├─ captureSnapshot() → TimelineSnapshot → branchFromState()
                                └─ createBranch() → child branch → compareBranches()

ImportEnvelope → createImportPlan() → validateScenario() → registerScenarios()
               → loadScenario() → new SimulationEngine → revision++

MonteCarloRequest → deriveSeed() → isolated SimulationEngine.run()
                  → computeDistributionStatistics() → Histogram
```

For engine semantics, see `docs/ENGINE.md`. For file formats, see `docs/DATA_FORMAT.md`. For end-to-end flows, see `docs/WORKFLOWS.md`.
