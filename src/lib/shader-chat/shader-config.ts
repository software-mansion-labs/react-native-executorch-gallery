import type { llm } from 'react-native-executorch';

/** Bounded choices keep every generated document executable without generating shader code. */
export const EFFECT_CHOICES = {
  effect: ['ripples', 'interference', 'stripes', 'checker', 'disk', 'gradient'],
  palette: ['ocean', 'sunset', 'violet', 'mono'],
  speed: [0, 0.25, 0.5, 1, 1.5, 2],
  scale: [2, 4, 6, 8, 12, 16],
  intensity: [0.25, 0.5, 0.75, 1],
  rotation: [0, 45, 90, 135],
} as const;

export type ShaderConfig = {
  [K in keyof typeof EFFECT_CHOICES]: (typeof EFFECT_CHOICES)[K][number];
};

/** Effect palettes are domain data, independent of Gallery's light/dark chrome. */
export const SHADER_PALETTES = {
  ocean: [
    [0.02, 0.08, 0.2],
    [0.1, 0.9, 0.95],
  ],
  sunset: [
    [0.3, 0.02, 0.2],
    [1, 0.65, 0.2],
  ],
  violet: [
    [0.12, 0.03, 0.32],
    [0.95, 0.35, 0.85],
  ],
  mono: [
    [0, 0, 0],
    [1, 1, 1],
  ],
} as const;

/** Rejects partial documents, extra keys and all values outside the grammar's finite domain. */
export function parseShaderConfig(source: string): ShaderConfig {
  const value: unknown = JSON.parse(source);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The effect description is not an object.');
  const record = value as Record<string, unknown>;
  const keys = Object.keys(EFFECT_CHOICES) as (keyof ShaderConfig)[];
  if (Object.keys(record).length !== keys.length)
    throw new Error('The effect description is incomplete or has unsupported fields.');
  for (const key of keys) {
    const allowed: readonly unknown[] = EFFECT_CHOICES[key];
    if (!allowed.includes(record[key])) throw new Error(`Unsupported effect parameter: ${key}.`);
  }
  return record as ShaderConfig;
}

export const SHADER_MESSAGES: readonly llm.ChatMessage[] = [
  {
    role: 'system',
    content: `You configure tested visual effects. Return only one JSON object in this key order:
{"effect":EFFECT,"palette":PALETTE,"speed":SPEED,"scale":SCALE,"intensity":INTENSITY,"rotation":ROTATION}
Allowed values: ${JSON.stringify(EFFECT_CHOICES)}.
Choose the closest supported effect. ripples=concentric circular waves, interference=two wave sources, stripes=parallel sine bands, checker=alternating squares, disk=solid circle, gradient=linear color blend.
Palettes: ocean=deep blue/cyan, sunset=purple/orange, violet=purple/pink, mono=black/white.
speed: 0 is still, 0.25 is very slow, 0.5 slow, 1 normal, 1.5 fast, 2 very fast.
scale controls frequency/tile count: 2 sparse, 4 broad, 6 medium, 8 dense, 12 finer, 16 very fine. For disk it controls size: 2 largest, 16 smallest. intensity controls contrast, 1 strongest.
rotation is in degrees and rotates stripe/gradient/checker direction. At 0 stripes are vertical; 90 makes them horizontal. Prefer rotation 0 if unspecified.
Use the request and previous settings supplied in the user message. Preserve settings not changed by an edit. Default to speed 1, scale 6, intensity 1, rotation 0. Never write shader code, explanations or Markdown.`,
  },
];

export const SHADER_STOP = /^\s*\{[^{}]*\}\s*$/;
