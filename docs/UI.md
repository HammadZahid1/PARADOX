# User Interface

The UI is a React 18 + Vite single-page app. It is browser-only: all views read from the local Zustand store or a local `SimulationEngine`; none call a backend or external AI service.

## Shell

`src/ui/App.tsx` renders:

```text
<a class="sr-only">Skip to main view</a>   [src/ui/App.tsx]
<Sidebar />                                [src/ui/components/Sidebar.tsx]
  <TopBar />                               [src/ui/components/TopBar.tsx]
  <main id="main-view">
    <ErrorBoundary><ViewRouter /></ErrorBoundary>
  </main>
  <StatusBar />                            [src/ui/components/StatusBar.tsx]
<CommandPalette /> <SearchDialog /> <ModalHost /> <Toasts />
```

`src/ui/ViewRouter.tsx` lazy-loads each view with `React.lazy` and wraps them in `Suspense` with `LoadingState`. `src/ui/components/ErrorBoundary.tsx` catches render errors and offers a “Retry render” button.

### Status bar diagnostics

`src/ui/components/StatusBar.tsx` is a compact live readout of the current engine:

| Field | Source |
| --- | --- |
| `BRANCH` | `engine.activeBranch.name` |
| `VARIABLES` | `Object.keys(branch.currentState.variables).length` |
| `EVENTS` | `branch.currentState.eventHistory.length` |
| `REV` | store `revision` |
| `SEED` | `engine.activeBranch.seed` |
| `ENGINE ONLINE` | static local status text |

`VARIABLES`, `EVENTS`, and `REV` are hidden at narrower Tailwind breakpoints; `SEED` is hidden below `md`. The footer reads both `engine` and `revision` from the store, so it is useful when confirming that an action actually stepped the engine.

## Views

All view ids are declared in `src/state/types.ts` and mapped in `src/ui/ViewRouter.tsx`:

| View id | File | Purpose |
| --- | --- | --- |
| `universe` | `src/ui/views/UniverseView.tsx` | 3D branch universe using `@react-three/fiber`, `three`, `d3-scale` |
| `lab` | `src/ui/views/LabView.tsx` | Simulation controls, variable table, event console |
| `timeline` | `src/ui/views/TimelineView.tsx` | Branch timeline and step navigation |
| `causal` | `src/ui/views/CausalView.tsx` | Causal graph view with layout mode from the store |
| `compare` | `src/ui/views/CompareView.tsx` | Two-branch comparison |
| `analytics` | `src/ui/views/AnalyticsView.tsx` | Trajectory metrics and charts |
| `scenarios` | `src/ui/views/ScenariosView.tsx` | Scenario library and loading |
| `world` | `src/ui/views/WorldView.tsx` | World/variable definitions |
| `events` | `src/ui/views/EventsView.tsx` | Event definitions and injection |
| `explorer` | `src/ui/views/ExplorerView.tsx` | Reality explorer |
| `decisions` | `src/ui/views/DecisionsView.tsx` | Decision alternatives and rationale |
| `snapshots` | `src/ui/views/SnapshotsView.tsx` | Snapshot list and restore |
| `history` | `src/ui/views/HistoryView.tsx` | Engine history with filters |
| `monte` | `src/ui/views/MonteView.tsx` | Local Monte Carlo batch UI |
| `settings` | `src/ui/views/SettingsView.tsx` | Workspace, playback, panels, shortcuts, privacy |

Navigation items are declared in `NAV_ITEMS` in `src/ui/components/Sidebar.tsx`. The sidebar collapses to an icon rail via the `TopBar` menu button; labels are shown through `Tooltip` when collapsed.

## State store

`src/state/store.ts` (`useParadox`, Zustand) owns:

- `engine: SimulationEngine | null`, `workspace`, `scenarios`, `activeScenarioId`
- UI state: `view`, `panels`, `panelSizes`, `selection`, `modal`, `toasts`, `commandOpen`, `searchOpen`
- Playback: `isPlaying`, `speed`, `replayStep`
- Preferences: `reducedMotion`, `showGrid`, `graphLayout`
- Actions: `bootstrap`, `loadScenario`, `tick`, `play`, `pause`, `stepForward`, `stepBackward`, `runBatch`, `reset`, `injectEvent`, `adjustVariable`, `createBranch`, `selectBranch`, `captureSnapshot`, `restoreSnapshot`, plus view/modal/toast setters

Every engine mutation increments `revision` so views re-render. `useEngineRevision()` exports the revision selector. `stepBackward()` locates the latest snapshot at or before the target step and calls `engine.restoreSnapshot()`; it does not replay deltas.

`usePlayback()` (`src/ui/hooks/usePlayback.ts`) sets an interval of `max(80, round(900 / speed))` ms while playing and pauses automatically when the branch reaches `complete`. Speed is clamped to `0.25–16`.

### Data flow for one step

```text
Space / Play button / tick action
  → useParadox.tick()
  → engine.step()
  → revision += 1, replayStep = activeBranch.currentState.step
  → subscribed views re-read engine state
  → StatusBar and EventConsole show the new branch/seed/log data
```

`runBatch(steps)` calls `engine.run(steps)` once and increments `revision` once, so it is the preferred bulk path. `setView()`, toggling panels, and opening modals change UI state only and do not increment `revision`. Calling engine methods directly without a store action will not notify views.

`loadScenario()` constructs a new `SimulationEngine`, pauses playback, clears `replayStep`, selects the new prime branch, and emits a success toast; previous branches, snapshots, and history are not carried over. `reset()` clears the current engine and recreates Prime Reality without replacing the engine object.

## Keyboard and command surface

`src/ui/hooks/useKeyboardShortcuts.ts` implements global keys; shortcuts are ignored while typing in inputs/textareas/selects or while a dialog is open.

| Key | Action |
| --- | --- |
| `Ctrl`/`Cmd` + `K` | Toggle command palette |
| `Escape` | Close modal, command palette, or search |
| `Space` | Play / pause |
| `ArrowRight` | Step forward |
| `ArrowLeft` | Step backward |
| `N` | New scenario dialog |
| `B` | New branch dialog |
| `E` | Inject event dialog |
| `S` | Snapshot dialog |
| `/` | Open search dialog |

Shortcut handling is registered by `src/ui/App.tsx`. Global keys are suppressed while focus is in `input`, `textarea`, `select`, or a content-editable element, and while `modal.kind`, `commandOpen`, or `searchOpen` is set; use the palette/search input's own key handling in those states. `Ctrl`/`Cmd` + `K` and `Escape` are handled before that suppression check.

`src/ui/commands.ts` builds the command list (`buildCommands()`), including navigation commands and shortcuts. `src/ui/components/CommandPalette.tsx` filters by label/group, supports `ArrowUp`/`ArrowDown`/`Enter`/`Escape`, and focuses the input on open. `src/ui/components/SearchDialog.tsx` uses `buildSearchIndex()` / `searchDocuments()` from `src/search/index.ts`; hits cover scenarios, variables, events, rules, and branches and navigate to the relevant view.

The search index is rebuilt with `useMemo` from `[scenarios, engine, revision]`, so newly imported scenarios and newly stepped branches become searchable without a manual refresh. The palette and dialog are separate surfaces: `Ctrl`/`Cmd` + `K` toggles the palette, while `/` opens search.

## Modals and feedback

`src/ui/modals/ModalHost.tsx` dispatches `ModalState.kind` from the store. Implemented dialogs in `src/ui/modals/`:

- `NewScenarioModal.tsx` — pick a preset or generate a scenario locally
- `NewBranchModal.tsx` — fork from current state or a snapshot, with reason/event anchor
- `InjectEventModal.tsx` — choose event and optionally override probability
- `ImportModal.tsx` — file/paste import, validated locally via `createImportPlan()`
- `ExportModal.tsx` — scenario/workspace/snapshot JSON preview and download
- `SnapshotModal.tsx`, `ConfirmModal.tsx`

`src/ui/components/Toasts.tsx` renders the last five store toasts. `src/ui/components/EventConsole.tsx` filters engine console entries by kind and text. `src/ui/components/ResizablePanel.tsx` exposes a pointer-drag separator with `role="separator"`.

## Persistence wiring

`src/ui/App.tsx` calls `usePersistence()` from `src/ui/hooks/usePersistence.ts`. Its effects are deliberately narrow:

1. On mount, `applySettings(loadSettings())` hydrates `compactMode`, `reducedMotion`, `showGrid`, `theme`, and panel sizes from `localStorage`.
2. After hydration, preference changes are mirrored with `saveSettings()`, using the current `view` as `defaultView`.
3. Non-preset scenarios are loaded once from `ParadoxRepository.getScenarios()` and merged through `importScenarios(custom, false)` without auto-loading one.
4. Changing `scenarios` or `workspace.activeScenarioId` saves the active scenario back to IndexedDB.

Worlds, realities, snapshots, workspaces, and history are not restored, and changing only `view` does not itself trigger a settings write. Loading a scenario replaces the engine; it does not rehydrate prior step state. See `docs/ARCHITECTURE.md` and `docs/DATA_FORMAT.md` for the storage boundary.

## Responsive behavior

Tailwind breakpoints (default `sm`, `md`, `lg`, `xl`) are used directly in views:

- Metric rows: `grid-cols-2` → `md:grid-cols-4/5/6`.
- Main panels: single-column on narrow screens → `lg:grid-cols-[...]` on wide screens.
- `TopBar` and `StatusBar` hide secondary text at smaller widths (`hidden sm:inline`, `hidden md:inline`, `hidden lg:inline`).
- `VariableTable` hides the trend column until `xl`.
- `MonteView` layers `sm:`, `md:`, and `lg:` layouts for charts and tables.
- `index.html` sets `viewport` width=device-width; `src/styles/index.css` sets full-height layout and hidden body overflow.

There is no dedicated mobile drawer, print stylesheet, or viewport-size persistence in this revision; narrow layouts stack via CSS and the sidebar collapses via the toolbar button.

## Reduced motion

Two mechanisms exist:

1. `src/styles/index.css` has a `@media (prefers-reduced-motion: reduce)` block that shortens all CSS animations/transitions.
2. The store's `reducedMotion` flag, toggled in `SettingsView`, suppresses modal fade-in (`src/ui/components/Modal.tsx`) and is passed into the 3D universe scene (`src/ui/views/UniverseView.tsx`).

Tailwind keyframes `pulseSoft` and `scan` are defined in `tailwind.config.js`.
