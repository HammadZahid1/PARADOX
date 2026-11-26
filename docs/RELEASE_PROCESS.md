# Release Process

PARADOX is a private (`"private": true`), browser-only prototype. There is no publish script, package registry target, or automated changelog generator in `package.json`. A release here means a version bump, a Git tag, GitHub release notes from the changelog, and a verified source tree. No build output is committed (`dist/` is ignored in `.gitignore`).

## 1. Preconditions

- [ ] Working on `main` with a clean tree; no force-push or tag rewrite has been performed.
- [ ] `npm ci` succeeds with the committed `package-lock.json`.
- [ ] Node 20 is available locally (the version used by `.github/workflows/ci.yml`).
- [ ] All intended code and docs are merged; `docs/ROADMAP.md` checkboxes reflect landed work only.

## 2. Versioning

1. Choose the next semantic version in `package.json` (`0.1.0` is the current version). Use a patch for fixes, minor for backward-compatible features, major for breaking data or behavior changes.
2. Sync the lockfile so `npm ci` does not fail on a version mismatch:

   ```powershell
   npm install --package-lock-only --ignore-scripts
   git diff -- package.json package-lock.json
   ```

3. Add an `Unreleased` or version section to `docs/CHANGELOG.md` using `Added`, `Changed`, `Fixed`, and `Removed` bullets. Reference real paths, and do not invent history for versions that were never tagged (`docs/CHANGELOG.md` records only the documented `0.1.0` snapshot).
4. Update `docs/UI.md`, `docs/ENGINE.md`, `docs/DATA_FORMAT.md`, `docs/TESTING.md`, `docs/QA_CHECKLIST.md`, or `docs/DETERMINISM.md` when the corresponding behavior changes.

## 3. Local verification

Run from the repository root and record the commands actually executed:

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

- `npm run typecheck` is `tsc -b --pretty false`; `npm run build` is `tsc -b && vite build`; `npm test` is `vitest run`.
- Do **not** list `npm run lint`: the script exists, but no ESLint dependency or configuration is installed (`docs/TESTING.md`).
- Do the manual browser pass in `docs/QA_CHECKLIST.md` against `npm run preview`, covering all views, shortcuts, reduced motion, responsive widths, import/export, branch isolation, and persistence.
- If engine behavior changed, include two-run fingerprint comparisons as described in `docs/DETERMINISM.md`.

## 4. Commit and push normally

```powershell
git add package.json package-lock.json docs/
git commit -m "Release vX.Y.Z"
git push origin main
```

Wait for `.github/workflows/ci.yml` (Node 20: `npm ci`, typecheck, test, build) and `.github/workflows/codeql.yml` to complete on the pushed commit. If CI fails, make a corrective commit and push it normally; never amend and force-push over shared history.

## 5. Tag only after green checks

```powershell
git tag -a vX.Y.Z -m "vX.Y.Z"
git tag -n
git push origin vX.Y.Z
```

- Use an annotated tag (`-a`) with the exact `v` + version string from `package.json`.
- Pushing a `v*` tag triggers `.github/workflows/ci.yml` again; confirm CI is green on the tag. CodeQL runs on `main` pushes, pull requests, and its weekly schedule, not on tag pushes.
- Never move, delete, or recreate a published tag, and never use `git push --force` or `git tag -f`. If a tag was created too early, leave it and publish a corrective patch release instead.

## 6. Release notes

1. On GitHub, create a release from the pushed tag; keep it a draft until verification is complete.
2. Paste the matching `docs/CHANGELOG.md` section as the release body. Include verification commands and the manual QA scope.
3. State that models are simplified fictional teaching tools, not real-world forecasts, and that the app is local-only with no account, server, or sync.
4. List known gaps honestly where relevant: no worker-backed Monte Carlo UI, no full workspace/history restore, no ESLint config, and no E2E/visual tests (`docs/CHANGELOG.md`, `docs/TESTING.md`, `docs/WORKFLOWS.md`).
5. Let GitHub generate the source archive for the tag. Do not attach `dist/`, `node_modules/`, `coverage/`, secrets, or locally exported scenario files.

## 7. Post-release verification

- [ ] `package.json`, `package-lock.json`, the tag, and the release title agree on the version.
- [ ] CI is green for the release commit and the tag; CodeQL is green for the release commit on `main`.
- [ ] A fresh clone passes `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] `npm run preview` followed by `docs/QA_CHECKLIST.md` passes on the tagged source.
- [ ] Release notes match `docs/CHANGELOG.md` and contain no unimplemented claims.
- [ ] No force-push, tag rewrite, secret, or external service was introduced.

## Hotfixes

Branch from the release tag, make the smallest fix with a colocated test and changelog entry, run the full verification above, and push a normal commit and a new patch tag (for example, `v1.2.3` is followed by `v1.2.4`). Merge the fix back to `main` through a normal pull request. History stays append-only throughout.
