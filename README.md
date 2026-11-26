# PARADOX

**PARADOX** is a browser-only alternate-reality simulation laboratory. It runs entirely in your browser tab: no backend, account, API key, paid service, or external AI dependency. All scenarios are deterministic, inspectable models, and the bundled climate/geopolitics presets are explicitly simplified fictional educational models — not real-world predictors.

## Features

- **17 bundled scenarios** across economics, civilisation, ecosystems, technology, fictional geopolitics, supply chains, urban systems, healthcare, energy, climate education, traffic, markets, education, manufacturing, research, disaster response, and an engine testbed. See `docs/SCENARIOS.md`.
- **Deterministic engine** with seeded variables, priority rules, conditional events, delayed causal propagation, snapshots, replay frames, and isolated branching realities. See `docs/ENGINE.md` and `docs/DETERMINISM.md`.
- **Fifteen lazy-loaded views** covering the universe, world, causal graph, timeline, events, history, snapshots, branches, decisions, comparison, Monte Carlo, analytics, explorer, scenarios, and settings.
- **Analysis toolkit**: trajectories, metrics, regression, autocorrelation, change points, sensitivity, distribution fitting, event impact, and Monte Carlo summaries.
- **Local persistence**: IndexedDB for scenarios, branches, and snapshots; localStorage for settings; versioned JSON import/export and local backup envelopes.
- **Keyboard-first UX**: command palette (`Ctrl`/`Cmd` + `K`), global search, playback shortcuts, reduced-motion support, accessible dialogs, toasts, and empty/error/loading states.
- **3D universe view** built with React Three Fiber and Drei, with a graceful fallback when WebGL is unavailable.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The test suite uses Vitest and React Testing Library with jsdom. CI runs the same three commands on pushes and pull requests; see `.github/workflows/ci.yml`.

## Project layout

```text
src/
  engine/       deterministic simulation engine, scenarios, analytics, determinism tools
  state/        Zustand store and typed actions
  ui/           app shell, views, components, modals, hooks
  persistence/  IndexedDB/localStorage adapters, migrations, usage accounting
  io/           versioned import/export envelopes
  search/       local search index and ranked results
  workers/      Monte Carlo Web Worker protocol and client
  utils/        ids, hashing, math, graph, formatting, and collection helpers
docs/           architecture, engine, scenario, UI, QA, and workflow documentation
```

## Documentation

Start with `docs/ARCHITECTURE.md`, then follow `docs/WORKFLOWS.md` for user flows, `docs/DATA_FORMAT.md` for local file formats, `docs/ACCESSIBILITY.md` for keyboard and motion support, and `docs/TESTING.md` for the verification strategy. `docs/ROADMAP.md` is a planning document; unchecked items are not claims of implemented behaviour.

## Limitations

- Everything is local to one browser profile; there is no sync, sharing service, server-side storage, or account recovery.
- Models are simplified and fictional. They are suitable for exploration and teaching causal feedback, not forecasting or decision-making about real systems.
- Monte Carlo results are deterministic for a fixed seed and ordered inputs, but large runs remain bounded by the device's CPU and memory.
- Some helper modules are intentionally unwired from the running UI; the documentation marks these explicitly.

## License

MIT. See `LICENSE`.
