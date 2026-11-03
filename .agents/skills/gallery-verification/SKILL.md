---
name: gallery-verification
description: Verify changes to react-native-executorch-gallery using fast checks, native release builds and relevant model/device checks. Use for validating gallery changes or diagnosing build and runtime failures.
---

# Gallery verification

Choose checks appropriate to the change. Static/script changes need the fast checks;
native dependency or configuration changes need a native build; navigation changes
need an in-app check; model, capture and visual changes need the relevant device
checks below. Report what ran and what could not run.

## Fast checks

Follow root `AGENTS.md` for bootstrap and dependency selection.

Run `npm run check`: selector regression tests, TypeScript, ESLint and Prettier.
The same checks run on pull requests ready for review. Drafts skip CI; run the
fast checks locally while iterating. These checks do not
establish that native code compiles or that inference succeeds.

Lefthook is installed as a dev dependency and installs its pre-commit hooks during
npm installation. Run `npm run hooks:install` if hooks were skipped. Hooks check
formatting without staging or rewriting files. If another tool owns
`core.hooksPath`, resolve that deliberately rather than overriding it automatically.
CI remains the authoritative check when hooks are unavailable or bypassed.

## Native builds

Every non-draft pull request and push to `main` runs the fast checks,
then Android and iOS release builds in parallel. `CI Status` requires all three
jobs to pass. Builds need no Expo account or signing secrets. Android builds a
standalone release APK for arm64 devices and x86_64 emulators. iOS builds an
unsigned Release app for an Apple Silicon simulator (the pinned library supplies
an arm64 simulator slice). Build products and failure diagnostics are retained
as workflow artifacts for seven days. Marking a draft ready for review starts CI;
converting it back to draft cancels the active run without starting build jobs.
Use `workflow_dispatch` to run CI manually on a branch, including a draft branch.

For local equivalents, install Android Studio / SDK and Java 17, or Xcode 26.4+
and CocoaPods, then run:

```bash
npm run native:android
npm run native:ios
```

Run the local platform commands sequentially: Expo prebuild shares template work
files. CI uses separate checkouts for the two platforms. Compiler concurrency is
limited to keep memory use predictable.

The scripts run Expo prebuild from `app.json` and preserve existing native
folders. Use a fresh checkout when checking generation from scratch. Android's
APK is `android/app/build/outputs/apk/release/app-release.apk`. The local release
APK uses Expo's generated development keystore for installation, not distribution.
iOS products are under `.artifacts/ios/Build/Products/Release-iphonesimulator/`;
`.artifacts/ios-simulator-app.tar.gz` preserves permissions and framework symlinks
when downloaded from CI.
Release builds bundle JavaScript and do not require Metro.

## Device checks for changed behavior

Use a real device for microphone/camera changes and inference performance. For
other UI changes a simulator is sufficient when it supports the affected model.
Choose a small model appropriate to the changed task; do not require all models
for every change.

1. Open the changed demo on a fresh installation or with that model deleted.
   Confirm that opening the screen does not download or prepare the model.
2. Request download. Check progress, successful preparation and enabled inputs.
   Run a fixed input (record the prompt or fixture) and check a meaningful result,
   rather than exact generative wording. Repeat with the network disabled after
   downloading to check offline inference.
3. For download/error changes, interrupt network access before download completes.
   Confirm a visible error, restored controls and a successful retry after
   reconnecting. For capture changes, deny permission and check recovery after
   granting it in system settings.
4. Open model storage, cancel deletion once, then confirm deletion while idle.
   Check that cached size/results reset and download is offered again. Re-download
   and run again. Navigate away/back and background/foreground during the changed
   operation; check that stale results or active capture do not reappear.
5. For visual changes, check light/dark appearance and the keyboard/safe-area
   layout relevant to the change.

Record the commit, device/OS, model, fixed input, checks performed and outcome in
the PR description. Attach relevant logs/screenshots from `.artifacts/`. State
unavailable checks and their reason explicitly; a passing build is not evidence of successful inference.
