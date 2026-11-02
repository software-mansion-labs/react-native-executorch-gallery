---
name: gallery-task-screen
description: Use when creating or modifying a task screen in the react-native-executorch-gallery app. Enforces the rule that screens stay minimal and only showcase idiomatic library usage, with any extra logic moved into JSDoc-annotated custom hooks.
metadata:
  id: gallery_task_screen
  scope: src/app/(screens)/*, src/hooks/*, src/components/*
---

# Skill: Gallery Task Screens

The gallery app (`react-native-executorch-gallery`) is a showcase, not a feature
app. Each screen exists to demonstrate the **idiomatic, minimal way to use the
library** for one task. When you build or edit a screen, keep it as simple and
clean as possible.

---

## 🚦 Rules

1. **A screen is a thin wrapper.** The `src/app/*.tsx` file should contain only:
   - A `use<Task>` hook call.
   - A few `useState`s for input, result, and error state.
   - A single `run()` handler that awaits the hook's callable.
   - The `<TaskScreen>` layout with the minimal UI needed to show the result.
   -
2. **Show the idiomatic library usage, nothing more.** Do not bloat the screen
   with preprocessing details, tensor manipulations, or library internals. The
   reader should see exactly how the hook + model config + callable are used.

3. **Move extra logic into custom hooks.** If a screen needs non-trivial state,
   derived data, or domain logic, extract it into a `use<Task>` custom hook in
   `src/hooks/`. Keep the actual screen lean.

4. **Every custom hook must have JSDoc.** Any hook you introduce must carry a
   `/** ... */` JSDoc block describing what it does, its props, and its returns.
   Match the style of the library's own hook docs.

5. **Use the shared components.** Reuse `<TaskScreen>`, `<ScreenWrapper>`, and
   the theme. Avoid re-inventing layout primitives already in the app.

6. **No inline colors or style values — always theme tokens.** Every color
   must come from the palette through `useTheme()` (`colors.*`), and `spacing`,
   `radius`, and `borderWidth` must come from `@/theme`. Never hardcode hex
   values, `rgba(...)` strings, raw pixel spacings, or raw border widths in a
   component. If a token doesn't exist, add it to `@/theme` rather than inlining
   a value. Exceptions: white-on-accent text/icon may use `colors.onAccent`, and
   geometric annotation boxes drawn over images keep their own visibility widths.

7. **Keep the README demo list current.** Whenever a demo is added, renamed, moved
   between categories, or removed in `src/lib/tasks.ts`, update the corresponding
   category and bullet in the root `README.md` Demos section. Use the catalogue's
   display name, link to the task screen, and update any stated demo count.

8. **Typecheck & format.** Run `npm run typecheck` and `npx prettier --write`
   after every change. Never leave type or format errors behind.

---

## ✅ The shape to aim for

```tsx
import { useState } from 'react';
import { models, useMyTask } from 'react-native-executorch';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';

function MyTaskScreen() {
  const [result, setResult] = useState<...>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const task = useMyTask(models.myTask.DEFAULT);

  const run = async () => {
    if (busy || !...) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await task.run(...));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen title="..." subtitle="..." status={task} canRun={...} busy={busy} onRun={run}>
      {/* minimal result UI */}
    </TaskScreen>
  );
}

export default function MyTaskScreenPage() {
  return (
    <ScreenWrapper>
      <MyTaskScreen />
    </ScreenWrapper>
  );
}
```

When the display logic grows, move it into a hook with JSDoc instead of growing
the screen.

---

## 🛠️ Verification Checklist

- [ ] Screen file is thin (hook + state + `run()` + minimal UI).
- [ ] No library internals (tensors, preprocessing, schema) in the screen.
- [ ] Any extra logic lives in a custom hook in `src/hooks/`.
- [ ] Every custom hook has a JSDoc block.
- [ ] Uses shared `<TaskScreen>` / `<ScreenWrapper>` / theme tokens.
- [ ] Every color comes from `useTheme()` / `@/theme` — no hex, `rgba(...)`, or raw value inline.
- [ ] No duplicated styles or raw pixel spacings/border widths.
- [ ] README demo categories, screen links, and demo count match `src/lib/tasks.ts`.
- [ ] `npm run typecheck` passes.
