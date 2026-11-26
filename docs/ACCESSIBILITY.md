# Accessibility

PARADOX is keyboard-driven and uses semantic HTML where practical. This page describes what is implemented in `src/ui/`, plus limitations to be aware of. It is not a certification or audit report.

## Implemented features

| Feature | Implementation |
| --- | --- |
| Skip link | `src/ui/App.tsx` renders a visually hidden link to `#main-view` that appears on focus |
| Landmarks | `header` in `src/ui/components/TopBar.tsx`, `nav aria-label="Primary navigation"` in `Sidebar.tsx`, `main id="main-view"`, `footer` in `StatusBar.tsx` |
| Focusable main region | `<main tabIndex={-1}>` in `App.tsx` |
| Modal semantics | `role="dialog"`, `aria-modal="true"`, `aria-label={title}` in `src/ui/components/Modal.tsx`; dialogs are also used by `CommandPalette.tsx` and `SearchDialog.tsx` |
| Escape handling | Global `Escape` closes modal/command/search in `src/ui/hooks/useKeyboardShortcuts.ts`; `Modal.tsx` also listens for `Escape` |
| Labelled controls | Icon-only buttons use `aria-label` in `TopBar.tsx` and `CommandPalette.tsx`; sliders and selects use `aria-label` in `src/ui/components/Slider.tsx`, `MonteView.tsx`, and others |
| Switch semantics | `src/ui/components/Toggle.tsx` uses `role="switch"` and `aria-checked` |
| Current-page indication | Sidebar buttons set `aria-current="page"` for the active view |
| Error alerts | `ImportModal.tsx` uses `role="alert"` for validation messages |
| Resize affordance | `ResizablePanel.tsx` uses `role="separator"` and `aria-orientation="vertical"` |
| Error recovery | `ErrorBoundary.tsx` shows a readable error and a retry button |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` in `src/styles/index.css`; store flag used by `Modal.tsx` and `UniverseView.tsx` |
| Settings reference | `src/ui/views/SettingsView.tsx` lists keyboard shortcuts and reduced-motion behavior |

## Keyboard shortcuts

From `src/ui/hooks/useKeyboardShortcuts.ts`. Shortcuts are suppressed while focus is in `INPUT`, `TEXTAREA`, `SELECT`, or a contenteditable element, and while a modal/palette/dialog is open.

| Key | Action |
| --- | --- |
| `Ctrl`/`Cmd` + `K` | Toggle command palette |
| `Escape` | Close modal / command palette / search |
| `Space` | Play or pause simulation |
| `ArrowRight` | Step forward |
| `ArrowLeft` | Step backward |
| `N` | New scenario |
| `B` | Create reality branch |
| `E` | Inject event |
| `S` | Create snapshot |
| `/` | Open search |

In `CommandPalette.tsx` and `SearchDialog.tsx`, `ArrowDown`/`ArrowUp` move the active result and `Enter` activates it. The command palette shows its `shortcut` hint from `src/ui/commands.ts` alongside each command group.

## Motion preferences

The CSS media query shortens animations and transitions globally. The in-app toggle in `SettingsView` sets `reducedMotion` in the Zustand store; `Modal.tsx` omits its fade-in class and `UniverseView.tsx` receives the flag as a scene prop when it is enabled. `usePersistence()` loads the value from `paradox:settings` on startup and saves it when toggled (see `docs/DATA_FORMAT.md`).

## Known limitations

- No automated axe/accessibility test is configured; `src/test/setup.ts` only installs jest-dom matchers.
- The causal graph and 3D universe rely on canvas/WebGL rendering; nodes are selectable by pointer in `UniverseView.tsx` but there is no documented equivalent keyboard graph traversal.
- `UniverseView.tsx` has no explicit WebGL-unavailable fallback message even though it is wrapped in `ErrorBoundary`.
- No high-contrast theme token set is defined in `tailwind.config.js`; the palette is dark-only (`void`, `graphite`, `carbon`, etc.).
- Focus is not explicitly restored to the invoking element after every modal close.
- There is no print stylesheet or dedicated screen-reader announcement region for run start/pause/completion.
- Color is used for severity and branch identity (`BRANCH_COLORS` in `src/engine/reality/branch.ts`); consider redundant text labels when extending charts.

## Guidance when adding UI

1. Keep every control reachable by Tab and give icon-only controls an `aria-label`.
2. Use native `button`, `input`, `select`, and `table` elements before introducing custom widgets.
3. Preserve `aria-current`, `role="dialog"`, and `Escape` behavior in new dialogs.
4. Gate new animations on both `prefers-reduced-motion` and the store's `reducedMotion` flag.
5. Add a `*.test.tsx` with Testing Library (already installed) and assert accessible names, not just text.

## Focus order walkthrough

The shell in `src/ui/App.tsx` establishes this predictable order:

| Order | Element | Notes |
| --- | --- | --- |
| 1 | Skip link | Visually hidden until focused; targets `#main-view` |
| 2 | `nav aria-label="Primary navigation"` | `Sidebar.tsx`; buttons set `aria-current="page"` |
| 3 | `header` | `TopBar.tsx`; icon buttons have `aria-label` values |
| 4 | `main#main-view` | `tabIndex={-1}`; contains the active lazy view |
| 5 | `footer` | `StatusBar.tsx`; visible branch/variable/event summary |
| 6 | Overlays | Command palette, search dialog, modal host, toasts render after the shell |

Sidebar collapse does not remove navigation items from the DOM; it hides their text labels and wraps each button in `src/ui/components/Tooltip.tsx` to preserve the accessible name.

## Dialog and overlay behavior

- `src/ui/components/Modal.tsx` renders `role="dialog"`, `aria-modal="true"`, and `aria-label={title}`. It has a labelled close button and closes on backdrop click or `Escape`.
- `CommandPalette.tsx` uses the same dialog semantics, focuses its input 20 ms after opening, and supports `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`.
- `SearchDialog.tsx` follows the same result-navigation pattern for local search hits.
- Toasts in `src/ui/components/Toasts.tsx` use `aria-live="polite"` and auto-dismiss after 4200 ms; each toast is itself a button that can be dismissed early.
- `ImportModal.tsx` marks validation failures with `role="alert"` so they are announced immediately.
- `ErrorBoundary.tsx` presents a readable error panel with a retry action instead of leaving a blank view.

## Labeled control inventory

| Control type | Example path | Labeling |
| --- | --- | --- |
| Icon button | `src/ui/components/TopBar.tsx` | `aria-label` such as `Play simulation`, `Reset simulation`, `Search workspace` |
| Slider | `src/ui/components/Slider.tsx` | `label` prop rendered with an associated control; views add `aria-label` where needed |
| Toggle | `src/ui/components/Toggle.tsx` | `role="switch"` plus `aria-checked` |
| Selects | `CompareView.tsx`, `AnalyticsView.tsx`, `MonteView.tsx`, `HistoryView.tsx`, `DecisionsView.tsx` | Explicit `aria-label` describing the selected reality, variable, category, or source |
| Separator | `ResizablePanel.tsx` | `role="separator"` and `aria-orientation="vertical"` |
| Data tables | `VariableTable.tsx`, `SnapshotsView.tsx`, `HistoryView.tsx`, `AnalyticsView.tsx` | Native `table`, `thead`, `th`, and `td` elements |

## Motion persistence details

`src/styles/index.css` applies `animation-duration: 0.01ms`, `animation-iteration-count: 1`, `transition-duration: 0.01ms`, and `scroll-behavior: auto` under `@media (prefers-reduced-motion: reduce)`. Independently, the Zustand `reducedMotion` flag removes the modal fade-in class and is passed to the 3D scene. `src/ui/hooks/usePersistence.ts` loads this flag from `paradox:settings` and saves it when changed; the OS media query still applies even if the app toggle is off.

## Manual verification checklist

1. Press `Tab` from page load; the skip link should be the first stop.
2. Reach every sidebar item and confirm `aria-current` follows the active view.
3. Open each dialog with its shortcut, close it with `Escape`, and confirm the underlying view returns.
4. Tab through command palette and search results with `ArrowUp`/`ArrowDown` and activate with `Enter`.
5. Verify icon-only top-bar controls announce their `aria-label` in a screen reader.
6. Trigger an invalid import and confirm the `role="alert"` message is announced.
7. Toggle reduced motion, reload, and confirm the value is restored from `localStorage`.
8. Resize to narrow width and confirm panels stack without horizontal overflow.
9. Force a render error and confirm `ErrorBoundary.tsx` shows the recovery panel.
10. Review new charts for text equivalents where color alone currently carries meaning.
