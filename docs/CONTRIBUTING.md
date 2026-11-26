# Contributing

PARADOX is a single Vite/TypeScript React app. Contributions should stay local-first: no backend, API key, telemetry endpoint, or external AI dependency. Scenario content is fictional/educational, not real-world forecasting.

## Repository layout

| Path | What belongs there |
| --- | --- |
| `src/engine/types/` | Shared domain interfaces only; re-export via `index.ts` |
| `src/engine/core/`, `events/`, `causal/`, `random/`, `timeline/`, `reality/`, `analytics/`, `comparison/` | Pure engine subsystems; no React imports |
| `src/engine/simulation/` | Engine orchestration and `StepResult` types |
| `src/engine/scenarios/` | Presets, factory helpers, local generator |
| `src/engine/validation/` | `ValidationResult` validators; no UI code |
| `src/state/` | Zustand store and UI-state types |
| `src/ui/` | React shell, views, components, hooks, modals |
| `src/persistence/`, `src/io/`, `src/workers/` | Browser boundaries: storage, files, workers |
| `src/search/`, `src/utils/` | Local-only helpers |
| `src/styles/` | Tailwind entry and global CSS |
| `docs/` | This documentation plus `ROADMAP.md` |

`docs/ROADMAP.md` uses stable task ids and checkboxes. Check off a task only when the corresponding code and tests actually land.

## Setup

```powershell
npm install
npm run dev        # Vite dev server
npm run typecheck  # tsc -b
npm test           # vitest run
npm run build      # tsc -b && vite build
```

Node/npm versions are not pinned by an `engines` field in `package.json`. The dev server uses `@` → `src` aliasing from `vite.config.ts`.

## Code conventions observed in the codebase

- TypeScript strict mode via `tsconfig.json`; prefer explicit types at public boundaries.
- Use `@/...` imports for files under `src`.
- Engine state transitions return new objects (`advanceClock`, `setVariable`, `applyEventEffects`); do not mutate a `WorldState` in place.
- Use `deepClone()` from `src/utils/clone.ts` for isolation at branch/snapshot/repository boundaries.
- Use `createId()` / `hashString()` from `src/utils/id.ts`; do not introduce network or crypto identifiers into engine transitions.
- Keep randomness behind `SeededRandom` (`src/engine/random/rng.ts`). Do not call `Math.random()` in simulation logic.
- Keep all scenario metadata deterministic: factory helpers use fixed timestamps (`createScenario()` sets 0).
- Validate external data with `src/engine/validation/` before it reaches the store.
- Prefer existing UI primitives in `src/ui/components/` (`Panel`, `Button`, `MetricCard`, `Modal`, charts) over one-off markup.
- Route UI mutations through `useParadox` actions in `src/state/store.ts` so `revision` is incremented consistently.

## Adding a scenario

1. Create `src/engine/scenarios/<name>.ts` with `makeVariable`, `makeRule`, `makeEvent`, and `createScenario` from `factory.ts`.
2. Use bounded numeric variables and explicit priorities; include a `description` and, for real-world-adjacent domains, a `disclaimer` saying the model is fictional/simplified.
3. Add a stable id and entry to `SCENARIO_PRESETS` in `src/engine/scenarios/index.ts`.
4. Add `src/engine/scenarios/<name>.test.ts` covering initialization and a deterministic run.
5. Do not fetch live data or imply predictive validity.

## Adding an engine subsystem

1. Define types in `src/engine/types/` and export them from `index.ts` if shared.
2. Keep the subsystem independent of React and browser globals; tests run under jsdom and Node-like contexts.
3. Inject `SeededRandom` rather than constructing clock-seeded randomness internally.
4. Add colocated `*.test.ts` files using existing fixtures from `src/engine/scenarios/factory.ts`.
5. Wire the subsystem into `SimulationEngine.step()` only if the new behavior is required every step; otherwise expose it as a callable helper.

## Adding UI

1. Add the view file under `src/ui/views/` and its `ViewId` in `src/state/types.ts`.
2. Register a lazy import in `src/ui/ViewRouter.tsx` and a nav item in `src/ui/components/Sidebar.tsx` if it should be discoverable.
3. Read engine data through `useParadox`, including `revision` where imperative engine state is displayed.
4. Use responsive Tailwind utilities (`sm`, `md`, `lg`, `xl`) and respect `reducedMotion`.
5. Provide accessible names for icon-only controls and keyboard paths for new interactions.
6. Add a `*.test.tsx` with Testing Library; matchers are configured in `src/test/setup.ts`.

## Tests and review checklist

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes with new colocated tests.
- [ ] `npm run build` succeeds.
- [ ] No new network calls, API keys, or external AI dependencies.
- [ ] No claims of real-world predictive accuracy for scenarios.
- [ ] Determinism-sensitive changes use `stateFingerprint()` / `statesEqual()` in tests.
- [ ] Branch isolation changes are covered by a test using `branchFromState()`.
- [ ] New persistence formats include version handling and validation.
- [ ] Documentation under `docs/` is updated when behavior changes.

## Current tooling gaps

CI runs typecheck, tests, and build on pushes and pull requests. There is no ESLint config/dependency despite the `lint` script, no E2E or visual tests, and no coverage thresholds. Keep that in mind when relying on checks; `docs/TESTING.md` lists the full gap set.

## Design rules that keep diffs reviewable

| Change | Preferred location | Why |
| --- | --- | --- |
| New rule/event trigger kind | `src/engine/types/`, `src/engine/events/` | Keeps semantics testable without React |
| New chart or control | `src/ui/components/` | Reuse existing `Panel`, `Button`, `Slider`, `Tabs`, chart primitives |
| New persisted type | `src/engine/types/`, `src/engine/validation/`, `src/persistence/repository.ts` | Validators and cloning must cover the type before storage |
| New keyboard action | `src/ui/hooks/useKeyboardShortcuts.ts`, `src/ui/commands.ts` | Keep shortcut and palette behavior consistent |
| New view | `src/state/types.ts`, `src/ui/ViewRouter.tsx`, `src/ui/components/Sidebar.tsx` | Type, lazy import, and discoverability must stay in sync |
| New envelope format | `src/engine/validation/import.ts`, `src/io/import.ts`, `src/io/export.ts` | Validation and import dispatch are separate boundaries |
| New Monte Carlo consumer | `src/workers/monteClient.ts` | Prefer the existing worker boundary over new main-thread loops |

## Determinism checklist for engine changes

1. Construct scenarios with `createScenario()` / `makeVariable()` / `makeRule()` / `makeEvent()` so ids and timestamps are fixed.
2. Inject the supplied `SeededRandom`; never call `Math.random()` or read the clock inside a transition.
3. Return new objects from transitions; do not write directly into `WorldState.variables`.
4. Assert equivalence with `statesEqual()` or inspect `stateFingerprint()`, not `JSON.stringify`.
5. If branch creation order matters, document that child seeds depend on `branches.size` in `SimulationEngine.createBranch()`.

## Adding a persistence format

1. Define the domain type under `src/engine/types/` and export it from `src/engine/types/index.ts`.
2. Add a validator under `src/engine/validation/` returning `ValidationResult`.
3. Add a store helper in `src/persistence/db.ts` and a validating method in `src/persistence/repository.ts`.
4. Decide explicitly whether the UI should call it; `usePersistence()` currently wires only settings and custom scenarios.
5. Add a colocated `*.test.ts` with `MemoryStorageAdapter` from `src/persistence/storage.ts`.

## Documentation expectations

- Update `docs/ENGINE.md` when step order, trigger semantics, propagation, or branch behavior changes.
- Update `docs/DATA_FORMAT.md` for any envelope, schema, settings, or repository change.
- Update `docs/UI.md` and `docs/WORKFLOWS.md` when a view, shortcut, dialog, or user-visible flow changes.
- Update `docs/CHANGELOG.md` with the exact paths touched; do not promote roadmap plans into implemented sections.
