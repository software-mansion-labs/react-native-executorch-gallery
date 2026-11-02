# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

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

Run `npm test`, `npm run typecheck`, and `npm run lint` for script or application
changes. Verify visual changes in the running app; use a real device for speech
capture checks.
