import { useState } from 'react';
import type { GeneratedApp } from '@/lib/widget-builder/app-builder';

export type ChecklistItem = { label: string; done: boolean };
export type WidgetValue = string | boolean | number | string[] | ChecklistItem[];

/** Keeps independent, immediately interactive widget values; reset restores the generated defaults. */
export function useWidgetValues(widget: GeneratedApp) {
  const defaults = () =>
    widget.controls.map((control): WidgetValue =>
      control.type === 'toggle'
        ? false
        : ['counter', 'rating', 'goal-counter'].includes(control.type)
          ? 0
          : control.type === 'single-select'
            ? control.options[0]
            : control.type === 'multi-select'
              ? []
              : control.type === 'checklist'
                ? control.items.map((label) => ({ label, done: false }))
                : ''
    );
  const [values, setValues] = useState(defaults);
  const [resetVersion, setResetVersion] = useState(0);
  const set = (index: number, value: WidgetValue) => {
    setValues((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };
  const fallback = defaults();
  return {
    values: widget.controls.map((_, index) => values[index] ?? fallback[index]),
    set,
    resetVersion,
    reset: () => {
      setValues(defaults());
      setResetVersion((version) => version + 1);
    },
  };
}
