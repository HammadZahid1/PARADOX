## Summary

<!-- What changed and why? Reference concrete paths such as `src/engine/simulation/engine.ts`. -->

## Verification commands

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manual browser pass for UI changes (see `docs/QA_CHECKLIST.md`)

`npm run lint` is declared in `package.json`, but ESLint is not configured or installed in this repository; do not report it as a passing check.

## Determinism checklist

- [ ] Same seed, scenario, and inputs produce the same `stateFingerprint()` / `statesEqual()` result (`src/engine/core/state.ts`).
- [ ] Randomness stays behind `SeededRandom` (`src/engine/random/rng.ts`); no `Math.random()` or clock reads in state transitions.
- [ ] Engine transitions return new objects; no in-place `WorldState` mutation.
- [ ] Event order, rule priority, branch creation order, and snapshot use are unchanged or documented.
- [ ] Replay-sensitive behavior is covered by `src/engine/determinism/*.test.ts` when applicable (see `docs/DETERMINISM.md`).
- [ ] Branch isolation is tested with `branchFromState()` when branch behavior changes.

## Local-only checklist

- [ ] No backend, API key, secret, telemetry endpoint, account, or external AI service.
- [ ] No scenario data leaves the browser; import/export stays local via `src/io/`.
- [ ] No claim of real-world predictive accuracy for fictional scenario models.
- [ ] New views/shortcuts are registered in `src/ui/ViewRouter.tsx`, `src/ui/commands.ts`, or `src/ui/hooks/useKeyboardShortcuts.ts` as appropriate, and documented in `docs/UI.md`.
- [ ] Persistence changes keep versioning and validation in `src/persistence/` and `src/engine/validation/`.
- [ ] `docs/CHANGELOG.md` records user-visible changes with concrete paths.
