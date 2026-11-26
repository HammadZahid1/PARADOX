# Testing

Tests run locally with Vitest and React Testing Library in jsdom. `.github/workflows/ci.yml` runs typecheck, tests, and build on pushes and pull requests. There is no browser E2E suite, visual-regression suite, accessibility audit tool, or coverage threshold in this repository; `docs/ROADMAP.md` lists those as future work.

## Latest verification snapshot

The complete suite was run locally against the repository at this documentation state:

```text
Test Files  210 passed (210)
Tests       811 passed (811)
```

`npm run typecheck` and `npm run build` also passed. CI is configured but this document does not claim a particular remote workflow run or status.

## Commands

From `package.json` (run from the repository root):

| Script | Command | Use |
| --- | --- | --- |
| `npm test` | `vitest run` | Single-pass test run |
| `npm run test:watch` | `vitest` | Watch mode during development |
| `npm run test:ui` | `vitest --ui` | Vitest UI |
| `npm run typecheck` | `tsc -b --pretty false` | TypeScript project build check |
| `npm run build` | `tsc -b && vite build` | Type check plus production bundle |
| `npm run dev` | `vite` | Local dev server |
| `npm run lint` | `eslint . --max-warnings 0` | Declared script; no ESLint config/dependency is installed in this revision |

The CI job uses `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` on Node 20.

## Configuration

`vitest.config.ts`:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  coverage: { reporter: ['text', 'html'], reportsDirectory: 'coverage' },
}
```

`src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and calls `cleanup()` after each test. `@/` resolves to `src` via aliases in both `vitest.config.ts` and `vite.config.ts`. `tsconfig.json` provides strict TypeScript settings used by `tsc -b`.

## Test map

Tests are colocated with source files as `*.test.ts` and `*.test.tsx`. Testing Library coverage includes reusable components under `src/ui/components/` and `src/ui/components/extra/`, modals under `src/ui/modals/`, hooks under `src/ui/hooks/`, the app bootstrap in `src/ui/App.test.tsx`, and a view-level interaction test in `src/ui/views/ScenariosView.test.tsx`.

| Area | Representative files |
| --- | --- |
| Engine state/variables/rules/expressions | `src/engine/core/state.test.ts`, `variables.test.ts`, `rules.test.ts`, `expression.test.ts` |
| Events | `src/engine/events/engine.test.ts`, `scheduler.test.ts`, `triggers.test.ts`, `effects.test.ts`, `queue.test.ts` |
| Causal graph and propagation | `src/engine/causal/graph.test.ts`, `propagation.test.ts`, `analysis.test.ts`, `layout.test.ts` |
| Causal helper modules | `src/engine/causalExtras/*.test.ts` (centrality, closure, diff, impact, layers, layout quality, neighborhoods, paths, validation, weights) |
| RNG and core distributions | `src/engine/random/rng.test.ts`, `distributions.test.ts` |
| Extended distributions | `src/engine/distributions/*.test.ts` (beta, binomial, empirical, gamma, log-normal, mixture, moments, sampler, transforms, truncated) |
| Simulation orchestration | `src/engine/simulation/engine.test.ts` |
| Timeline/history/snapshots/replay | `src/engine/timeline/*.test.ts` |
| Branches/decisions | `src/engine/reality/branch.test.ts`, `decisions.test.ts` |
| Analytics and comparison | `src/engine/analytics/*.test.ts`, `src/engine/analyticsExtra/*.test.ts`, `src/engine/comparison/*.test.ts` |
| Insights | `src/engine/insights/*.test.ts` (autocorrelation, change points, distribution fitting, event impact, regression, scenarios, sensitivity, windows) |
| Determinism | `src/engine/determinism/*.test.ts` (budget, checksum, guard, idle, inputs, replay, streams, telemetry) |
| Monte Carlo | `src/engine/monte/runner.test.ts`, `statistics.test.ts`, `workerProtocol.test.ts`, `index.test.ts` |
| Validation | `src/engine/validation/*.test.ts` |
| Original presets and factory | `src/engine/scenarios/*.test.ts` |
| Extra presets and combined library | `src/engine/scenarios/extra/*.test.ts`, `src/engine/scenarios/library.test.ts` |
| Persistence | `src/persistence/storage.test.ts`, `settings.test.ts`, `migration.test.ts`, `repository.test.ts`, `usage.test.ts`, `src/persistence/extra/*.test.ts` |
| I/O | `src/io/io.test.ts`, `src/io/extra/*.test.ts` |
| Search | `src/search/search.test.ts`, `src/search/extra/*.test.ts` |
| Utilities | `src/utils/*.test.ts` |
| Worker protocol | `src/workers/protocol.test.ts` |
| Store actions | `src/state/store.test.ts` |
| App and reusable UI | `src/ui/App.test.tsx`, `src/ui/components/*.test.tsx`, `src/ui/components/extra/*.test.tsx` |
| Hooks and modals | `src/ui/hooks/*.test.tsx`, `src/ui/modals/*.test.tsx` |
| Views | `src/ui/views/ScenariosView.test.tsx` |
| Chart utilities | `src/ui/chartUtils/*.test.ts` |

`src/engine/analyticsExtra/`, `src/io/extra/`, `src/search/extra/`, `src/ui/chartUtils/`, and most of `src/ui/components/extra/` are library modules with their own tests; they are not all called from the running UI. Tests verify module behavior, not end-to-end product usage of each helper.

## Conventions used by existing tests

- Construct scenarios with `createScenario()` / `makeVariable()` / `makeRule()` / `makeEvent()` from `src/engine/scenarios/factory.ts` for stable ids and fixed timestamps.
- Compare state via `stateFingerprint()` / `statesEqual()` from `src/engine/core/state.ts`, not raw JSON; `createId()` and history timestamps are intentionally non-deterministic.
- Use `LocalStorageAdapter` with an injected `Storage`, or `MemoryStorageAdapter` from `src/persistence/storage.ts`, rather than relying on ambient browser storage.
- Validate worker messages with `isMonteWorkerMessage()` from `src/engine/monte/workerProtocol.ts` and outbound guards from `src/workers/protocol.ts`.
- Keep tests independent: `createAllPresets()` and `createAllLibraryPresets()` return fresh scenario objects, and each `SimulationEngine` owns its own branches and states.
- Use `vi.fn()` for progress callbacks and cancellation predicates, as in `src/engine/simulation/engine.test.ts`; `run()` stops before the next step when `shouldCancel()` returns true.
- For component tests, import `act`, `fireEvent`, `render`, and `screen` from `@testing-library/react`; `src/test/setup.ts` already registers jest-dom matchers and calls `cleanup()` after each test. `CommandPalette.test.tsx` demonstrates resetting `useParadox` state in both `beforeEach()` and `afterEach()`.
- Assert accessible roles and names (`getByRole('dialog', { name: ... })`) rather than only text, because these tests also serve as a lightweight accessibility regression check.
- Import/export tests in `src/io/io.test.ts` and helpers under `src/io/extra/` exercise complete envelopes, including round-trips, serialization helpers, and rejection of invalid payloads.
- Scenario filtering is covered at both component and view level: `ScenarioFilter.test.tsx` asserts accessible query/domain controls, while `ScenariosView.test.tsx` checks visible results and the empty-filter state.

## Suggested test flow for a change

1. Reproduce the behavior in the smallest layer: expression, rule, event, propagation, engine, store, then component or view.
2. Add or update a colocated test with a fixed seed and explicit `createdAt: 0` / `updatedAt: 0` fixture values.
3. Run `npm run test:watch` while iterating, then `npm test` and `npm run typecheck` before calling the work done.
4. If persistence or import changed, add a case using `MemoryStorageAdapter` or an envelope fixture so no ambient browser state is required.
5. If UI behavior changed, add a Testing Library case that drives the store through `act()` and checks the resulting role/name or text.
6. Confirm CI covers the same commands before merging; do not treat a local pass as proof of a remote workflow run.

## What a good new test covers

```ts
// Example shape, using real paths and helpers
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

const a = new SimulationEngine(scenario);
const b = new SimulationEngine(scenario);
a.run(10);
b.run(10);
// assert(statesEqual(a.activeBranch.currentState, b.activeBranch.currentState))
```

## Known gaps

- Only `ScenariosView` has view-level coverage; other views and full multi-view workflows are not covered by tests.
- No browser-driven E2E, visual-regression, or accessibility-audit suite (for example axe); the manual pass is documented in `docs/QA_CHECKLIST.md`.
- No property-based or mutation testing setup.
- No coverage thresholds are configured; coverage output is available but not enforced.
- No performance benchmark or cross-browser matrix.
- `npm run lint` is declared but not usable without an ESLint dependency/config.
- CI is configured but remote workflow runs are not validated by this local test suite.
