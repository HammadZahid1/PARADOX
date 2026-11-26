# Security and Privacy

PARADOX is a **browser-only, local-first** application. It has no backend, no account system, no API keys, no cloud sync, and no external AI service. Simulation data stays in the current tab/browser profile unless the user explicitly exports it.

## Trust model

| Boundary | Implementation | Security posture |
| --- | --- | --- |
| Simulation engine | `src/engine/` | Pure local computation; no network or filesystem access |
| Scenario expressions | `src/engine/core/expression.ts` | Hand-written tokenizer/parser for `+ - * /`, numbers, parentheses, identifiers; **no `eval`, `new Function`, or dynamic code** |
| Imported files | `src/io/import.ts`, `src/engine/validation/` | JSON parse then envelope/format validation; invalid payloads never enter the store |
| Worker messages | `src/workers/protocol.ts`, `src/engine/monte/workerProtocol.ts` | Runtime type guards (`isMonteRunMessage`, `isMonteCancelMessage`, `isMonteWorkerMessage`) |
| Persistence | `src/persistence/` | Browser sandbox (IndexedDB/localStorage); repository validates and clones before writes |
| Downloads | `src/io/export.ts` | Blob + object URL, click, then `URL.revokeObjectURL()` |
| Rendering | React JSX under `src/ui/` | Text is escaped by React; no `dangerouslySetInnerHTML` usage in the UI |

`index.html` contains no external scripts, remote fonts, analytics tags, or CSP meta tag. `src/styles/index.css` and `tailwind.config.js` reference font families by name but do not load remote font files.

### What is out of scope by design

- No login, roles, permissions, session tokens, or server-side authorization; anyone with access to the browser profile can open the app.
- No remote configuration, feature flags, update service, telemetry, crash reporting, or AI endpoint.
- No cryptographic storage: IndexedDB and `localStorage` values are plain data in the browser profile.
- No sandbox for imported size or complexity; validation checks shape and references, not resource budget.

These omissions are deliberate for a local educational simulator, not side effects of a partially configured backend.

## Expression boundary

Derived variables use `evaluateExpression()` in `src/engine/core/expression.ts`. The tokenizer accepts whitespace, parentheses, `+ - * /`, decimal numbers, and identifiers matching `[A-Za-z_][A-Za-z0-9_]*`; anything else throws. Identifiers are resolved only from the numeric variable map supplied by `recomputeDerived()` (`src/engine/core/variables.ts`). Unknown identifiers, empty input, unbalanced parentheses, and malformed token sequences throw and are caught by the caller; division by zero evaluates to `0`.

This means a scenario can express arithmetic feedback but cannot call functions, reach globals, evaluate strings as code, or open network/API objects. Do not replace this parser with `eval`, `new Function`, a template compiler, or a general-purpose expression library without re-reviewing the trust model.

## Worker boundary

`createMonteRunRequest()` (`src/workers/protocol.ts`) builds outbound `monte:run` messages; `isMonteRunMessage()` and `isMonteCancelMessage()` guard inbound worker commands. `src/workers/monte.worker.ts` ignores unrecognized messages, tracks cancellation by request id, and replies with guarded `monte:progress`, `monte:result`, or `monte:error` messages. `startMonteWorker()` in `src/workers/monteClient.ts` ignores replies with mismatched request ids and terminates the worker on completion or error. The worker receives scenario objects already held in the local store; `isMonteRunMessage()` guards the message shape but does not perform full `validateScenario()` checking. No untrusted URLs, functions, or callbacks cross the boundary.

## Data handling

- Scenarios, branches, timelines, snapshots, and history are generated locally from presets in `src/engine/scenarios/` or user input in dialogs such as `src/ui/modals/NewScenarioModal.tsx`.
- `src/ui/modals/ExportModal.tsx` previews exported JSON and downloads `paradox-<kind>.json`. It does not upload anything.
- `src/ui/modals/ImportModal.tsx` reads a local file via `file.text()` or pasted text and validates it with `createImportPlan()`. Its helper text states that no network requests are made.
- `src/ui/views/SettingsView.tsx` communicates to users that there is no server, account, or sync. Preferences live in the Zustand store and are mirrored to `localStorage` by `src/ui/hooks/usePersistence.ts`; `src/persistence/settings.ts` is a local-only module.
- Monte Carlo trials in `src/ui/views/MonteView.tsx` construct isolated engines from cloned scenarios and never alter the active workspace engine.

## Identifier and randomness caveats

`createId()` in `src/utils/id.ts` combines `Date.now()`, a counter, and `Math.random()`. `SeededRandom` in `src/engine/random/rng.ts` is Mulberry32. These are suitable for local labels and reproducible simulations, **not** for cryptographic secrets, session tokens, or security-sensitive randomness. Do not reuse them for authentication or key generation.

## Validation limits

`validateEnvelope()` (`src/engine/validation/import.ts`) checks format, version range 1–3, and non-null payload. `validateScenario()` checks required strings, variables, events, positive step settings, finite seed, optional graph, and objective references. These validators protect shape and internal references; they are not a sandbox for pathological input.

Be aware of the following limitations:

- No checksum or signature in the export envelope; imported JSON has no tamper detection.
- `paradox-world` envelopes pass envelope validation but have no handler in `createImportPlan()`.
- `createImportPlan()` does not call `migratePayload()`; legacy payloads that only differ by schema version are not auto-upgraded on import.
- Very large arrays (many runs, snapshots, or events) can consume memory; there is no import size limit in the UI.
- Derived expressions are safe from code execution but unknown identifiers and malformed syntax throw inside `evaluateExpression`; `recomputeDerived()` catches those errors and ignores the variable.
- The local browser profile can read IndexedDB/localStorage data; clearing site data removes persisted values. There is no encryption at rest.
- No dependency audit, SRI, CSP, or security CI gate is configured in this repository.

## Imported and exported data

Exports are deterministic JSON snapshots of local objects:

- `exportScenario()` wraps a scenario in `{ format: 'paradox-scenario', version: 1, payload }`.
- `exportWorkspace()` uses `paradox-workspace` with `{ workspace, scenarios }`.
- `exportSnapshot()` uses `paradox-snapshot` around a single `TimelineSnapshot`.
- `downloadText()` in `src/io/export.ts` creates a Blob URL, clicks a temporary anchor, removes it, and calls `URL.revokeObjectURL()`; nothing is uploaded.

Imports are parsed with `parseImportEnvelope()` and checked by `validateEnvelope()` before `createImportPlan()` dispatches on `format`. `paradox-scenario` payloads pass `validateScenario()`, workspace payloads pass `validateScenarioList()`, and snapshot payloads get the small `validateSnapshot()` check. A `paradox-world` envelope passes envelope validation but falls through to snapshot validation rather than a world handler; do not assume it is loaded. `migratePayload()` in `src/persistence/migration.ts` exists but is not called by the import path.

Treat an exported file like any other local document: keep it in a trusted location, review it before sharing, and expect no tamper detection. `ImportModal.tsx` displays validation issues with `role="alert"` and leaves the store untouched when the plan is invalid.

## Browser storage controls

Preferences live under the `paradox:settings` `localStorage` key via `src/persistence/settings.ts`; scenarios and other local records go through `ParadoxRepository` (`src/persistence/repository.ts`) into IndexedDB using `src/persistence/db.ts`. `usePersistence()` (`src/ui/hooks/usePersistence.ts`) hydrates settings, mirrors preference changes, imports non-preset scenarios, and saves the active scenario; it does not restore full worlds, realities, snapshots, workspaces, or history.

Clearing site data for the origin removes these values. Private browsing or disabled storage can make `openParadoxDb()` throw, and corrupt `localStorage` JSON is treated as missing by `LocalStorageAdapter.get()`. There is no encryption at rest, no cross-device sync, and no recovery channel outside exported JSON.

## Reporting and handling issues

When reporting a security concern, include the exact file path (for example `src/io/import.ts`), the input envelope, the browser, and whether persistence was involved. Because there is no server, reproduction should be possible from local JSON and `npm run dev`.

## Safe contribution rules

1. Never add secrets, tokens, remote endpoints, or telemetry to source or scenario metadata.
2. Never replace the expression parser with `eval`-style evaluation.
3. Keep worker and import guards in place when extending message or envelope formats.
4. Validate and clone new persisted types in `src/persistence/repository.ts`.
5. Keep scenario text explicit about being fictional/simplified when touching climate or geopolitics presets.
6. Keep rendering as JSX text; do not introduce `dangerouslySetInnerHTML` for descriptions, names, logs, or imported JSON.
7. Add runtime guards for any new worker message type in both `src/workers/protocol.ts` and `src/engine/monte/workerProtocol.ts`.
8. If a new persisted type is added, extend `src/persistence/repository.ts` validation and cloning plus `src/persistence/migration.ts` defaults.
9. If a new import format is added, implement an explicit handler in `createImportPlan()` and a matching validator in `src/engine/validation/`.

## Review checklist for a change

Before calling a security-sensitive change complete, confirm: no network call was introduced; no secret was committed; the expression path still uses the hand-written parser; imported data still enters the store only after validation; UI text still uses React escaping; and `npm run typecheck` plus `npm test` pass. There is no security CI gate in this revision, so these checks are manual.
