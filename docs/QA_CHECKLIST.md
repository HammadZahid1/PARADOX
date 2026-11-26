# Manual QA Checklist

Use this before calling a build release-ready. `npm test` runs Vitest unit tests, but there is no E2E, visual-regression, or accessibility-audit suite in this repository (`docs/TESTING.md`), so the browser pass is manual.

## Setup and recording

- [ ] Start from the commit or tag under test; record it here: `__________`.
- [ ] Install and start locally: `npm ci`, then `npm run dev` (or `npm run build` + `npm run preview` for the production bundle).
- [ ] Record browser/version, OS, viewport, scenario id, seed, and `configuration.mode`: `__________`.
- [ ] DevTools → Console: no uncaught errors on load or while stepping.
- [ ] DevTools → Network: only localhost/dev-server assets; no API calls, telemetry, or remote fetches.
- [ ] Use a browser profile you can clear afterwards; no real credentials or private scenario data are required.

## Views

Walk every view registered in `src/ui/ViewRouter.tsx` (ids in `src/state/types.ts`). Each lazy view should resolve from its `Suspense` fallback in `src/ui/components/LoadingState.tsx` without a blank screen.

| View | File | Check |
| --- | --- | --- |
| Lab | `src/ui/views/LabView.tsx` | [ ] Play/pause, single-step, +10, speed, reset; variable table and event console update after each step; no `NaN`/`undefined` values. |
| Timeline | `src/ui/views/TimelineView.tsx` | [ ] Branch polylines, checkpoints, event markers, and divergence rings render; clicking a branch updates selection; the **Replay position** slider changes the chart domain only, not the engine step. |
| Universe | `src/ui/views/UniverseView.tsx` | [ ] 3D scene renders and responds to node selection; grid/reduced-motion flags behave as set in Settings; WebGL-unavailable case is handled by `src/ui/components/ErrorBoundary.tsx` (no dedicated fallback exists). |
| Causal | `src/ui/views/CausalView.tsx` | [ ] Graph renders from `engine.causalGraph`; switching layout via `setGraphLayout()` in `src/state/store.ts` redraws; relation details are readable. |
| Compare | `src/ui/views/CompareView.tsx` | [ ] Choose two realities; Trajectories, Differences, and Events tabs populate from `compareBranches()` (`src/engine/comparison/compare.ts`); **Swap** reverses sides; **Focus right** updates selection but does not activate the branch. |
| Analytics | `src/ui/views/AnalyticsView.tsx` | [ ] Trajectories, metrics, and event charts come from recorded data only; changing the variable/branch selector refreshes the panels. |
| Scenarios | `src/ui/views/ScenariosView.tsx` | [ ] All presets from `src/engine/scenarios/index.ts` appear with seed, mode, propagation limit, steps, and duration; **Load** creates a fresh engine, resets playback, and shows a toast. |
| World | `src/ui/views/WorldView.tsx` | [ ] Numeric sliders call `adjustVariable()` on the active branch; derived variables are read-only; active events and recent changes refresh; no timeline entry is added by a slider change. |
| Events | `src/ui/views/EventsView.tsx` | [ ] Definitions show trigger/effect descriptions; fired records and direct **Inject** actions work; probability override appears in `src/ui/modals/InjectEventModal.tsx`. |
| Explorer | `src/ui/views/ExplorerView.tsx` | [ ] Parent/ancestry, divergence step/time/event, children, and divergence-vs-current values are shown; **Activate** changes the engine's active branch. |
| History | `src/ui/views/HistoryView.tsx` | [ ] Chronological entries render; category, branch, and query filters work; **Reset filters** clears all three. |
| Snapshots | `src/ui/views/SnapshotsView.tsx` | [ ] Manual and automatic (`autoSnapshotSteps`) checkpoints appear; detail panel reads the snapshot's own state; **Restore** replaces the selected branch's current state; **Delete** removes it from the in-memory engine. |
| Decisions | `src/ui/views/DecisionsView.tsx` | [ ] Decision alternatives and rationale render; creating a branch from a decision carries the `eventId` into `src/ui/modals/NewBranchModal.tsx`. |
| Monte | `src/ui/views/MonteView.tsx` | [ ] Small batch (10 runs, 20 steps) completes; **Cancel** keeps partial runs and reports cancelled; statistics/histogram render; note this view runs on the main thread and does not call `startMonteWorker()`. |
| Settings | `src/ui/views/SettingsView.tsx` | [ ] Workspace rename, display/playback toggles, panel visibility and sizing sliders, shortcut reference, and local-data notice all work. |

## Keyboard and command surface

Verify against `src/ui/hooks/useKeyboardShortcuts.ts` and `src/ui/commands.ts`:

- [ ] `Ctrl`/`Cmd` + `K` toggles the command palette; `Escape` closes palette, search, or modal.
- [ ] `Space` toggles play/pause; `ArrowRight` steps forward; `ArrowLeft` performs snapshot-based step backward.
- [ ] `N`, `B`, `E`, `S` open the new-scenario, new-branch, inject-event, and snapshot dialogs.
- [ ] `/` opens search; `ArrowUp`/`ArrowDown` move through results and `Enter` navigates (`src/ui/components/CommandPalette.tsx`, `src/ui/components/SearchDialog.tsx`).
- [ ] Shortcuts are ignored while typing in `INPUT`, `TEXTAREA`, `SELECT`, or contenteditable elements, and while a dialog is open.
- [ ] Palette entries from `buildCommands()` run the advertised actions and show their shortcut hints.

## Reduced motion

- [ ] With OS `prefers-reduced-motion: reduce` enabled, reload: the media query in `src/styles/index.css` shortens animations/transitions and disables smooth scrolling.
- [ ] Toggle **Reduced motion** in `SettingsView.tsx`: modal fade-in is suppressed (`src/ui/components/Modal.tsx`) and the flag reaches the 3D scene.
- [ ] Toggle it off again: OS preference still applies when set.
- [ ] Reload and confirm the in-app value is restored from `localStorage` key `paradox:settings` via `src/ui/hooks/usePersistence.ts`.

## Responsive widths

Check at 375 px, 768 px, 1024 px, and 1440 px wide:

- [ ] No horizontal page overflow; nested panels scroll internally.
- [ ] Panel grids stack at narrow widths and use the `lg:` multi-column layouts from `docs/UI.md` at wide widths.
- [ ] `TopBar.tsx` and `StatusBar.tsx` hide secondary text at smaller breakpoints; icon buttons retain accessible names.
- [ ] `VariableTable.tsx` hides the trend column until `xl`.
- [ ] Collapsing the sidebar leaves an icon rail with tooltips from `src/ui/components/Tooltip.tsx`.
- [ ] Charts and 3D canvas remain legible and usable at each width.

## Import and export

- [ ] `src/ui/modals/ExportModal.tsx` produces valid `{ format, version, payload }` JSON with `EXPORT_VERSION = 1` (`src/io/export.ts`) for scenario, workspace, and snapshot; **Download JSON** writes a local file.
- [ ] Re-import an exported scenario and workspace through `src/ui/modals/ImportModal.tsx`; `createImportPlan()` (`src/io/import.ts`) accepts them and the first scenario loads.
- [ ] Importing a snapshot reports that it can be inspected but is not loaded as a scenario.
- [ ] Malformed JSON or an unknown `format` shows the `role="alert"` message; `paradox-world` is accepted by the envelope validator but has no import dispatch and must not silently load.
- [ ] No network request occurs during any import or export; export does not mutate store state.

## Branch isolation

- [ ] Create a branch from the current state and another from a snapshot via `src/ui/modals/NewBranchModal.tsx` or shortcut `B`.
- [ ] `branchFromState()` in `src/engine/reality/branch.ts` leaves the parent state untouched at the fork step; verify in Explorer and Compare.
- [ ] Child branch has its own seed, color, timeline, and divergence metadata; stepping the child does not change the parent's current state (`SimulationEngine.createBranch()` in `src/engine/simulation/engine.ts`).
- [ ] Restore a snapshot on one branch and confirm other branches are unchanged; **Reset** recreates a single prime branch and clears snapshots.
- [ ] For a defect, record the seed, scenario id, steps, and `stateFingerprint()` in an **Engine defect** issue.

## Persistence

- [ ] Change reduced motion, show grid, and a panel size; reload and confirm `paradox:settings` restores them through `loadSettings()` (`src/persistence/settings.ts`). Panel visibility and playback speed are session-only; the saved `defaultView` is not applied on startup.
- [ ] Generate or import a custom scenario, reload, and confirm `ParadoxRepository.getScenarios()` restores it from IndexedDB (`src/ui/hooks/usePersistence.ts`).
- [ ] Confirm the documented limits: worlds, realities, snapshots, workspaces, and history records are **not** restored on startup, and the saved `defaultView` does not navigate on load.
- [ ] Clear site data and confirm locally stored settings and custom scenarios are removed; no remote record remains.

## Sign-off

- [ ] All failures filed with the bug or engine-defect issue template, including reproduction steps and environment.
- [ ] `.github/workflows/ci.yml` is green for this commit and `.github/workflows/codeql.yml` has no new alerts.
- [ ] Release notes or `docs/CHANGELOG.md` mention manual QA scope and any known gaps.
