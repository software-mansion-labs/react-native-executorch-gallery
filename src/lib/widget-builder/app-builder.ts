import type { llm } from 'react-native-executorch';

import {
  WIDGET_COLOR_NAMES,
  isWidgetColorChoice,
  type WidgetColorChoice,
  type WidgetAccent,
} from '@/lib/widget-builder/widget-colors';

export type AppControl = (
  | { type: 'text' | 'toggle' | 'counter' | 'rating' | 'number-input'; label: string }
  | { type: 'single-select' | 'multi-select'; label: string; options: string[] }
  | { type: 'checklist'; label: string; items: string[] }
  | { type: 'goal-counter'; label: string; target: number; step?: number }
  | { type: 'timer'; label: string; seconds: number }
) & { accent?: WidgetAccent; emphasis?: boolean };
export type WidgetAppearance = WidgetColorChoice & {
  layout: 'stacked' | 'grid';
  alignment: 'left' | 'center';
};
export const DEFAULT_WIDGET_APPEARANCE: WidgetAppearance = {
  scheme: 'light',
  background: 'gray',
  accents: ['blue', 'brown', 'green'],
  layout: 'stacked',
  alignment: 'left',
};
export type GeneratedApp = {
  title: string;
  description: string;
  controls: AppControl[];
  appearance: WidgetAppearance;
};

export const APP_BUILDER_MESSAGES: readonly llm.ChatMessage[] = [
  {
    role: 'system',
    content: `Create one useful interactive widget. Return compact JSON only, keys in order:
{"appearance":{...},"title":STRING,"description":STRING,"controls":[CONTROL,...]}
Title: short, starting with a matching emoji. Description: 2-4 words stating purpose, not features or styling.

Appearance keys in order:
{"scheme":"light"|"dark","background":COLOR,"accents":[COLOR,COLOR,COLOR],"layout":"stacked"|"grid","alignment":"left"|"center"}
COLOR: ${WIDGET_COLOR_NAMES.join('|')}.
Use requested colors exactly: an unqualified color sets background; accent colors go in accents. Infer unspecified colors from mood. Light backgrounds are pale, dark backgrounds deep. Accents are primary, secondary, tertiary. Text, gradients and typography are automatic. Use grid for counters/goals, stacked for longer controls.

Choose 1-6 controls. Follow these key orders:
{"type":"single-select","label":STRING,"options":[STRING,...]}: exactly ONE alternative; selecting another replaces the previous selection.
{"type":"multi-select","label":STRING,"options":[STRING,...]}: ZERO OR MORE independent options selected together.
{"type":"checklist","label":STRING,"items":[STRING,...]}: actions to mark DONE, never choices/settings. Group related tasks.
{"type":"goal-counter","label":STRING,"target":INTEGER}: progress toward a goal. Optional step after target: positive, up to 3 decimals, default 1. Target/step share units; include units in label.
{"type":"timer","label":STRING,"seconds":INTEGER}: start/pause/reset countdown.
Other controls use {"type":TYPE,"label":STRING}: counter(+/-1),number-input(numeric),rating(five stars),toggle(on/off),text(free-form input only if requested).
"Pick one" MUST use single-select. Multiple options do not imply multiple simultaneous selections.
Controls may append accent(primary|secondary|tertiary), then emphasis(boolean). Emphasize at most one counter/goal.
INTEGER: 1-9999. Options: 2-6; items: 1-6. Keep labels short. No extra properties, explanations, markdown or submit buttons.`,
  },
];

export type WidgetPreview = GeneratedApp & { appearanceReady: boolean };

/** Extracts only completed fields/controls from the constrained stream, respecting braces inside quoted labels. */
export function readWidgetBuild(source: string): WidgetPreview {
  const title = completedWidgetString(source, 'title');
  const description = completedWidgetString(source, 'description');
  let appearance = DEFAULT_WIDGET_APPEARANCE;
  let appearanceReady = false;
  const appearanceSource = source.match(/^\s*\{\s*"appearance"\s*:\s*\{([^{}]*)/)?.[1];
  if (appearanceSource) {
    const fields: Record<string, unknown> = Object.fromEntries(
      [...appearanceSource.matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g)].map((match) => [
        match[1],
        match[2],
      ])
    );
    const accents = appearanceSource.match(/"accents"\s*:\s*(\[[^\]]*\])/);
    if (accents) {
      try {
        fields.accents = JSON.parse(accents[1]);
      } catch {
        // Keep the default accents until the generated array is complete and valid.
      }
    }
    const candidate: unknown = { ...DEFAULT_WIDGET_APPEARANCE, ...fields };
    if (
      Object.hasOwn(fields, 'scheme') &&
      Object.hasOwn(fields, 'background') &&
      isWidgetAppearance(candidate)
    ) {
      appearance = candidate;
      appearanceReady = true;
    }
  }
  const controls: AppControl[] = [];
  const controlsMatch = source.match(/"controls"\s*:\s*\[/);
  const marker = controlsMatch?.[0] ?? '';
  const start = controlsMatch?.index ?? -1;
  if (start >= 0) {
    let depth = 0;
    let quoted = false;
    let escaped = false;
    let objectStart = -1;
    for (let index = start + marker.length; index < source.length; index++) {
      const character = source[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') {
        quoted = true;
        continue;
      }
      if (character === '{') {
        if (depth === 0) objectStart = index;
        depth++;
      }
      if (character === '}') {
        depth--;
        if (depth === 0 && objectStart >= 0) {
          try {
            const control: unknown = JSON.parse(source.slice(objectStart, index + 1));
            const validated = parseGeneratedApp(
              JSON.stringify({
                title: 'Widget',
                description: 'Preview',
                controls: [control],
                appearance: DEFAULT_WIDGET_APPEARANCE,
              })
            );
            controls.push(validated.controls[0]);
          } catch {
            break;
          }
          objectStart = -1;
        }
      }
      if (character === ']' && depth === 0) break;
    }
  }
  return { title, description, controls, appearance, appearanceReady };
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const keys = (value: Record<string, unknown>, expected: string[]) =>
  Object.keys(value).sort().join() === [...expected].sort().join();

/** Validates a generated document before mounting its interactive native controls. */
export function parseGeneratedApp(text: string): GeneratedApp {
  const app: unknown = JSON.parse(text);
  if (
    !record(app) ||
    !keys(app, ['title', 'description', 'controls', 'appearance']) ||
    !string(app.title) ||
    !string(app.description) ||
    !Array.isArray(app.controls) ||
    app.controls.length < 1 ||
    app.controls.length > 6
  )
    throw new Error('The generated app is incomplete. Try again.');
  for (const control of app.controls) {
    if (
      !record(control) ||
      !string(control.label) ||
      ![
        'text',
        'toggle',
        'counter',
        'rating',
        'number-input',
        'single-select',
        'multi-select',
        'checklist',
        'goal-counter',
        'timer',
      ].includes(String(control.type))
    )
      throw new Error('The widget contains an invalid control.');
    const extra =
      control.type === 'single-select' || control.type === 'multi-select'
        ? 'options'
        : control.type === 'checklist'
          ? 'items'
          : control.type === 'goal-counter'
            ? 'target'
            : control.type === 'timer'
              ? 'seconds'
              : undefined;
    if (
      !keys(control, [
        'type',
        'label',
        ...(extra ? [extra] : []),
        ...(control.type === 'goal-counter' && 'step' in control ? ['step'] : []),
        ...('accent' in control ? ['accent'] : []),
        ...('emphasis' in control ? ['emphasis'] : []),
      ])
    )
      throw new Error('The widget contains unexpected control properties.');
    if ('step' in control) {
      const step = control.step;
      if (
        typeof step !== 'number' ||
        !Number.isFinite(step) ||
        step <= 0 ||
        step > 9999.999 ||
        Math.abs(step * 1000 - Math.round(step * 1000)) > 0.000001
      )
        throw new Error('The widget contains an invalid goal step.');
    }
    if (
      'accent' in control &&
      !['primary', 'secondary', 'tertiary'].includes(String(control.accent))
    )
      throw new Error('The widget contains an invalid accent.');
    if ('emphasis' in control && typeof control.emphasis !== 'boolean')
      throw new Error('The widget contains invalid emphasis.');
    if (extra === 'options' || extra === 'items') {
      const entries = control[extra];
      if (
        !Array.isArray(entries) ||
        entries.length < (extra === 'options' ? 2 : 1) ||
        entries.length > 6 ||
        !entries.every((entry) => string(entry))
      )
        throw new Error('The widget contains an invalid list.');
    } else if (extra) {
      const value = control[extra];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 9999)
        throw new Error('The widget contains an invalid numeric setting.');
    }
  }
  if (!isWidgetAppearance(app.appearance))
    throw new Error('The widget contains an invalid appearance.');
  return app as GeneratedApp;
}

function isWidgetAppearance(value: unknown): value is WidgetAppearance {
  return (
    record(value) &&
    keys(value, ['scheme', 'background', 'accents', 'layout', 'alignment']) &&
    ['stacked', 'grid'].includes(String(value.layout)) &&
    ['left', 'center'].includes(String(value.alignment)) &&
    isWidgetColorChoice(value)
  );
}

const jsonText = String.raw`"(?:[^"\\]|\\[\s\S])*"`;
/** Stops only after the complete root document, including escaped text and numeric/boolean settings. */
export const WIDGET_STOP_REGEX = new RegExp(
  String.raw`^\s*\{\s*"appearance"\s*:\s*\{[^{}]*\}\s*,\s*"title"\s*:\s*${jsonText}\s*,\s*"description"\s*:\s*${jsonText}\s*,\s*"controls"\s*:\s*\[\s*\{(?:${jsonText}|[^"{}])*\}(?:\s*,\s*\{(?:${jsonText}|[^"{}])*\})*\s*\]\s*\}\s*$`
);

function completedWidgetString(source: string, key: string): string {
  const match = source.match(new RegExp(String.raw`,\s*"${key}"\s*:\s*(${jsonText})`));
  if (!match) return '';
  try {
    return JSON.parse(match[1]);
  } catch {
    return '';
  }
}
