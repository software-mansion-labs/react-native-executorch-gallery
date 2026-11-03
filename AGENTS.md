# Repository guide

This Expo / React Native app demonstrates idiomatic on-device ExecuTorch usage.
Keep task screens thin and reuse shared components and hooks.

## Map

- `src/app/`: Expo Router routes; task screens live in `(screens)/`.
- `src/lib/tasks.ts`: demo catalogue, categories and search metadata; keep README demo links in sync.
- `src/components/`: shared UI and task-specific presentation.
- `src/hooks/`: state, resource lifecycle and domain hooks; document new hooks with JSDoc.
- `src/lib/`: parsing, grammar, model cache and other non-UI utilities.
- `src/theme.ts`: palette and design tokens.
- `scripts/`: dependency selection and regression tests.

For task screen work, read `.agents/skills/gallery-task-screen/SKILL.md`.
Use `src/app/(screens)/image-classification.tsx` as a current small example.

## Setup

Use Node 24 (`nvm use`), npm and Corepack (`corepack enable`). On a fresh checkout,
run `npm run deps:sync`: it restores the selected archive before running `npm ci`.
Plain `npm ci` needs that ignored archive to exist first. See README for native prerequisites.
Use `npm run check` for the same fast checks as CI, including draft pull requests.

## Expo and native code

When changing Expo APIs or configuration, consult the matching SDK 57 documentation
at https://docs.expo.dev/versions/v57.0.0/. The app requires a native build; Expo Go
and web previews cannot validate native inference.

`ios/` and `android/` are generated and ignored. Make lasting native configuration
changes in `app.json` or config plugins. Rebuild after changing native dependencies,
plugins or ExecuTorch versions.

# ExecuTorch version selection

`executorch.json` records the selected library source. Run `npm run deps:status` before changing it.

- Published package: `npm run deps:use -- npm <version-or-tag>`
- Cutting-edge source: `npm run deps:use -- git <branch/tag/SHA>` (records a pinned commit)
- Local development: `npm run deps:use -- local ../react-native-executorch`
- Restore the recorded selection: `npm run deps:sync`

Use these commands instead of editing the dependency by hand. Commit `executorch.json`,
`package.json`, and `package-lock.json` together when changing versions. A Git source checkout
is managed in `.executorch/`; never reset or switch a developer's local library checkout.
Native app builds must be rebuilt after switching library versions.

# Verification

Run `npm run check` for script or application changes (tests, typecheck, lint and
format check). Format changed files with `npx prettier --write <paths>`.
See `.agents/skills/gallery-verification/SKILL.md` for native builds and device
checks. Verify visual changes in the running app; speech and camera capture need
a real device. Record the platform/device and checks performed. Explicitly report
checks that could not run and why; passing static checks alone does not verify
native behavior. Put logs/screenshots under ignored `.artifacts/`.

Before finishing, inspect `git diff` for unrelated changes. Do not include generated
native projects, model downloads or local source snapshots in commits.
