# Changelog

This file records the documented state of the repository. `package.json` declares version `0.1.0`; no tagged releases or prior release notes are available in this workspace, so this page does not invent history. `docs/ROADMAP.md` is a plan, not a changelog.

## 0.1.0 — documented implementation snapshot

Status: browser-only local prototype with CI checks. No release pipeline, changesets, automated changelog generation, or tagged releases are configured.

### Implemented: foundation

- Vite + React 18 + TypeScript app in `src/main.tsx`, `src/ui/App.tsx`, `index.html`.
- Tailwind styling in `src/styles/index.css` and `tailwind.config.js`.
- Path alias `@` → `src` in `vite.config.ts` and `vitest.config.ts`.
- Vitest/jsdom test setup in `vitest.config.ts` and `src/test/setup.ts`.
- Repository automation in `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, issue/PR templates, `.editorconfig`, Prettier config, MIT `LICENSE`, and the documentation index in `docs/README.md`.

### Implemented: engine

- `SimulationEngine` in `src/engine/simulation/engine.ts` with `step()`, `run()`, `injectEvent()`, `adjustVariable()`, snapshots, branches, history, and console logs.
- Deterministic state construction, clock advance, and fingerprints in `src/engine/core/state.ts`.
- Rule evaluation in `src/engine/core/rules.ts`, arithmetic effects in `src/engine/core/variables.ts`, and safe expression parsing in `src/engine/core/expression.ts`.
- Seeded Mulberry32 RNG in `src/engine/random/rng.ts`, core distributions in `src/engine/random/distributions.ts`, and extended distribution helpers in `src/engine/distributions/`.
- Event triggers/scheduling/effects in `src/engine/events/` with deterministic vs probabilistic mode semantics.
- Bounded causal propagation with delays in `src/engine/causal/propagation.ts` plus graph analysis helpers under `src/engine/causalExtras/`.
- Branch helpers and decision helpers in `src/engine/reality/`.
- Trajectories, metrics, comparison, insights, and deterministic replay/checksum helpers under `src/engine/analytics/`, `src/engine/analyticsExtra/`, `src/engine/comparison/`, `src/engine/insights/`, and `src/engine/determinism/`.
- Monte Carlo runner/statistics and guarded worker protocol under `src/engine/monte/` and `src/workers/`.
- Validators under `src/engine/validation/`.

### Implemented: scenarios

- Seventeen presets are exposed through `src/engine/scenarios/library.ts`: the original seven in `src/engine/scenarios/index.ts` (economy, civilization, ecosystem, technology, fictional geopolitics, supply chain, urban) and ten extras in `src/engine/scenarios/extra/` (healthcare, energy, climate education, traffic, markets, education, manufacturing, research, disaster response, and an engine testbed).
- `src/ui/App.tsx` bootstraps `createAllLibraryPresets()` so all seventeen are available in the application.
- Deterministic scenario builders in `src/engine/scenarios/factory.ts`.
- Blank and locally generated scenarios in `src/engine/scenarios/custom.ts`; no network or AI calls.
- Scenario documentation and UI disclaimer text identifying models as simplified/fictional.

### Implemented: UI

- Sidebar navigation, top bar playback controls, status bar, toasts, command palette, and local search.
- Fifteen lazy-loaded views under `src/ui/views/`, reusable components under `src/ui/components/` and `src/ui/components/extra/`, and dialogs under `src/ui/modals/`.
- Query and domain filtering in `src/ui/components/ScenarioFilter.tsx` and `src/ui/views/ScenariosView.tsx`, including an empty-result state.
- Keyboard shortcuts in `src/ui/hooks/useKeyboardShortcuts.ts`; playback clock in `src/ui/hooks/usePlayback.ts`.
- Reduced-motion support through `src/styles/index.css` and the store flag.
- Responsive multi-column layouts via Tailwind breakpoints.
- Chart utilities in `src/ui/chartUtils/` with dedicated tests; many remain available helper modules rather than active view dependencies.

### Implemented: browser boundaries

- IndexedDB schema/helpers in `src/persistence/db.ts` and validated repository in `src/persistence/repository.ts`.
- localStorage settings helpers in `src/persistence/settings.ts`, storage adapters in `src/persistence/storage.ts`, migration helpers in `src/persistence/migration.ts`, usage estimate in `src/persistence/usage.ts`, and helpers under `src/persistence/extra/`.
- Versioned JSON envelope import/export in `src/io/`, with additional serialization, CSV, manifest, warning, filename, share-link, and version-negotiation helpers in `src/io/extra/`.
- Local search and ranking modules in `src/search/` and `src/search/extra/`.

### Repository documentation

- Root `README.md` plus `docs/` pages for architecture, workflows, engine, scenarios, UI, accessibility, data format, troubleshooting, testing, determinism, performance, security, contributing, QA, release process, changelog, glossary, and roadmap.
- Unchecked items in `docs/ROADMAP.md` remain plans and are not implementation claims.

### Partial wiring and remaining gaps

- `src/ui/App.tsx` calls `usePersistence()` for settings and custom-scenario load/save, but it does not restore worlds, realities, snapshots, workspaces, or history records.
- `src/ui/views/MonteView.tsx` runs batches on the main thread in chunks and does not call `startMonteWorker()`.
- Several tested helper-module batches in `src/engine/causalExtras/`, `src/engine/analyticsExtra/`, `src/io/extra/`, `src/search/extra/`, `src/ui/chartUtils/`, and `src/ui/components/extra/` are intentionally unwired from runtime views.
- CI is configured; there is no release automation, E2E/visual/axe suite, or coverage threshold. `npm run lint` is declared but ESLint is not installed/configured.
- No telemetry, server sync, account system, real-time data feed, real-world data integration, or external AI dependency.

## How to update this file

1. Add an `Unreleased` section with `Added`, `Changed`, `Fixed`, and `Removed` bullets.
2. Reference concrete paths (for example `src/engine/causal/propagation.ts`) so claims are verifiable.
3. Do not describe a module as user-facing until the UI actually calls it.
4. Move `Unreleased` into a version section only when the project adopts a release process.

## Implementation detail inventory

### Validation and I/O

- `ValidationIssue` / `ValidationResult` and `combine()` in `src/engine/validation/common.ts`.
- Envelope parsing and 1–3 version checks in `src/engine/validation/import.ts`.
- Scenario, variable, event, graph, and world validators under `src/engine/validation/`.
- `createImportPlan()` branches for scenario/workspace/snapshot in `src/io/import.ts`; no `paradox-world` handler.
- Envelope writers and `downloadText()` in `src/io/export.ts`.

### State and interaction

- `useParadox` store with `bootstrap`, `loadScenario`, playback, branch, snapshot, view, modal, and toast actions in `src/state/store.ts`.
- Global shortcuts in `src/ui/hooks/useKeyboardShortcuts.ts` and playback interval in `src/ui/hooks/usePlayback.ts`.
- Settings/repository bridge in `src/ui/hooks/usePersistence.ts`.
- Command definitions in `src/ui/commands.ts`, local search in `src/search/`, and ranking/suggestion helpers in `src/search/extra/`.

### Engine and analytics

- `step()` and `run()` orchestration in `src/engine/simulation/engine.ts`.
- Trigger semantics in `src/engine/events/triggers.ts`, including deterministic probability forcing.
- Immediate/delayed causal propagation in `src/engine/causal/propagation.ts`.
- Fingerprint-based reproducibility in `src/engine/core/state.ts`.
- Trajectory/metric helpers in `src/engine/analytics/` and branch comparison in `src/engine/comparison/`.

## Explicitly absent in this snapshot

| Capability | Evidence |
| --- | --- |
| Backend/API/account/AI service | No server module; `src/ui/views/SettingsView.tsx` states local-only operation |
| Real-world forecasting | Preset disclaimers and `docs/SCENARIOS.md` describe simplified fictional models |
| Worker-backed Monte Carlo UI | `src/ui/views/MonteView.tsx` does not call `src/workers/monteClient.ts` |
| Full workspace/history restore | `usePersistence()` only loads settings and non-preset scenarios |
| Release automation | No release script or tagged release in this workspace; CI is configured in `.github/workflows/ci.yml` |
| ESLint enforcement | `lint` script exists but no ESLint config/dependency is installed |
| E2E/visual/axe tests | No Playwright/Cypress/axe config; `vitest.config.ts` only includes `*.test.ts`/`*.test.tsx` |
| Coverage thresholds | Coverage reporters are configured, but no thresholds are set |

## Verification snapshot

```powershell
npm install
npm run typecheck
npm test -- --run
npm run build
```

Latest local results at this documentation state: `npm run typecheck` passed, `npm test -- --run` passed with **210 test files and 811 tests**, and `npm run build` passed. `.github/workflows/ci.yml` runs `npm ci`, typecheck, tests, and build on pushes and pull requests; these local results do not assert a remote workflow status.

Use `npm run dev` for manual UI verification. `npm run preview` serves the production build locally. `npm run test:watch` and `npm run test:ui` are developer conveniences.

## Maintenance rules

1. Keep bullets tied to a concrete file path that exists in the workspace.
2. Mark modules as available-but-unwired when the UI does not call them, as with the Monte Carlo worker.
3. Describe scenario content as educational fiction, never as calibrated prediction.
4. Update `docs/ROADMAP.md` checkboxes only when code and tests land; do not copy unchecked roadmap text into implemented sections.
5. Keep verification counts tied to an actual run; do not infer CI status from local commands.
