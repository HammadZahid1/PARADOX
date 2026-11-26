# Testing

Tests run locally with Vitest. There is no CI workflow, browser E2E suite, or visual-regression suite in this repository; `docs/ROADMAP.md` lists those as future work.

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
| `npm run lint` | `eslint . --max-warnings 0` | Declared script; no ESLint config/dependency is present in this revision |

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

Tests are colocated with source files as `*.test.ts` and `*.test.tsx`. Component tests use Testing Library and live beside the components under `src/ui/components/`; view-level tests are not present.

| Area | Representative files |
| --- | --- |
| Engine state/variables/rules/expressions | `src/engine/core/state.test.ts`, `variables.test.ts`, `rules.test.ts`, `expression.test.ts` |
| Events | `src/engine/events/engine.test.ts`, `scheduler.test.ts`, `triggers.test.ts`, `effects.test.ts`, `queue.test.ts` |
| Causal | `src/engine/causal/graph.test.ts`, `propagation.test.ts`, `analysis.test.ts`, `layout.test.ts` |
| RNG/distributions | `src/engine/random/rng.test.ts`, `distributions.test.ts` |
| Simulation orchestration | `src/engine/simulation/engine.test.ts` |
| Timeline/history/snapshots/replay | `src/engine/timeline/*.test.ts` |
| Branches/decisions | `src/engine/reality/branch.test.ts`, `decisions.test.ts` |
| Analytics/comparison | `src/engine/analytics/*.test.ts`, `src/engine/comparison/*.test.ts` |
| Monte Carlo | `src/engine/monte/runner.test.ts`, `statistics.test.ts`, `workerProtocol.test.ts`, `index.test.ts` |
| Validation | `src/engine/validation/*.test.ts` |
| Presets/generator/factory | `src/engine/scenarios/*.test.ts` |
| Persistence | `src/persistence/storage.test.ts`, `settings.test.ts`, `migration.test.ts`, `repository.test.ts`, `usage.test.ts` |
| I/O | `src/io/io.test.ts` |
| Search | `src/search/search.test.ts` |
| Utilities | `src/utils/clone.test.ts`, `format.test.ts`, `graph.test.ts`, `id.test.ts`, `math.test.ts` |
| Worker protocol | `src/workers/protocol.test.ts` |
| Store actions | `src/state/store.test.ts` |
| UI components | `src/ui/components/CommandPalette.test.tsx`, `Modal.test.tsx`, `Toasts.test.tsx`, `Button.test.tsx` |
| Utilities beyond the core set | `src/utils/text.test.ts`, `stableStringify.test.ts`, `sortedList.test.ts`, `seed.test.ts`, `emitter.test.ts` |

More engine areas also have direct coverage: `src/engine/determinism/*.test.ts`, `src/engine/insights/*.test.ts`, `src/engine/distributions/*.test.ts`, and `src/engine/comparison/*.test.ts`.

## Conventions used by existing tests

- Construct scenarios with `createScenario()` / `makeVariable()` / `makeRule()` / `makeEvent()` from `src/engine/scenarios/factory.ts` for stable ids and fixed timestamps.
- Compare state via `stateFingerprint()` / `statesEqual()` from `src/engine/core/state.ts`, not raw JSON; `createId()` and history timestamps are intentionally non-deterministic.
- Use `LocalStorageAdapter` with an injected `Storage`, or `MemoryStorageAdapter` from `src/persistence/storage.ts`, rather than relying on ambient browser storage.
- Validate worker messages with `isMonteWorkerMessage()` from `src/engine/monte/workerProtocol.ts` and outbound guards from `src/workers/protocol.ts`.
- Keep tests independent: `createAllPresets()` returns fresh scenario objects, and each `SimulationEngine` owns its own branches and states.
- Use `vi.fn()` for progress callbacks and cancellation predicates, as in `src/engine/simulation/engine.test.ts`; `run()` stops before the next step when `shouldCancel()` returns true.
- For component tests, import `act`, `fireEvent`, `render`, and `screen` from `@testing-library/react`; `src/test/setup.ts` already registers jest-dom matchers and calls `cleanup()` after each test. `CommandPalette.test.tsx` demonstrates resetting `useParadox` state in both `beforeEach()` and `afterEach()`.
- Assert accessible roles and names (`getByRole('dialog', { name: ... })`) rather than only text, because these tests also serve as a lightweight accessibility regression check.
- Import/export tests in `src/io/io.test.ts` exercise complete envelopes, including round-trips for scenarios and workspaces and rejection of invalid payloads.

## Suggested test flow for a change

1. Reproduce the behavior in the smallest layer: expression, rule, event, propagation, engine, store, then component.
2. Add or update a colocated test with a fixed seed and explicit `createdAt: 0` / `updatedAt: 0` fixture values.
3. Run `npm run test:watch` while iterating, then `npm test` and `npm run typecheck` before calling the work done.
4. If persistence or import changed, add a case using `MemoryStorageAdapter` or an envelope fixture so no ambient browser state is required.
5. If UI behavior changed, add a Testing Library case that drives the store through `act()` and checks the resulting role/name or text.

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

- Component tests cover selected `src/ui/components/` files, but there are no view-level tests and no full-workflow tests.
- No accessibility audit tool (for example axe) and no E2E/browser automation flows.
- No property-based or mutation testing setup.
- No coverage thresholds are configured; coverage output is available but not enforced.
- No performance benchmark or cross-browser matrix.
- `npm run lint` is declared but not usable without an ESLint dependency/config.
