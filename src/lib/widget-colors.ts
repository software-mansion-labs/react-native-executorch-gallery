type Shades = readonly [background: string, gradientEnd: string, accent: string];
const family = (light: Shades, dark: Shades) => ({ light, dark });

/** Widget-only color families: soft backgrounds and readable accents for either scheme. */
export const WIDGET_COLORS = {
  gray: family(['#F0F0F2', '#E1E1E6', '#515762'], ['#18191D', '#252326', '#BDC1CA']),
  brown: family(['#F5EBDD', '#EEE0CC', '#75471E'], ['#2D211B', '#3B2A20', '#D7AE87']),
  red: family(['#F6E5E3', '#EED6D5', '#A12E43'], ['#321E23', '#43272E', '#FF827C']),
  orange: family(['#FBE8DF', '#F5D8CE', '#97471F'], ['#33241D', '#443026', '#EEA16C']),
  amber: family(['#F8EDDA', '#F0E0C0', '#805316'], ['#302719', '#403522', '#E7BD79']),
  yellow: family(['#FAF0CE', '#F2E3AF', '#705A14'], ['#2E2A18', '#3E3823', '#E8D17E']),
  lime: family(['#F0F2DA', '#E4E9C6', '#596218'], ['#252D1B', '#333D25', '#CDD88B']),
  olive: family(['#F1ECDD', '#E6DFCA', '#64602C'], ['#292B1D', '#383B28', '#C7CA97']),
  green: family(['#EDF0E9', '#E0E6DA', '#3E6345'], ['#182B24', '#22392C', '#ACCEA0']),
  teal: family(['#E3F0EC', '#D3E5DF', '#32675E'], ['#152D2A', '#1D3C35', '#9ED0C2']),
  cyan: family(['#E5F0F4', '#D5E6EC', '#2F6475'], ['#142A38', '#1B3948', '#96D5DF']),
  blue: family(['#E8F0F6', '#D9E7F0', '#315D90'], ['#1B2535', '#223247', '#A9C2FF']),
  violet: family(['#EFEAF7', '#E4DCF0', '#6D498A'], ['#232339', '#302C49', '#C7B6F3']),
  pink: family(['#F9E2EB', '#F3D2E0', '#9A3266'], ['#302231', '#3F2B3F', '#F2B6D5']),
} as const;

export type WidgetColor = keyof typeof WIDGET_COLORS;
export type WidgetAccent = 'primary' | 'secondary' | 'tertiary';
export type WidgetColorChoice = {
  scheme: 'light' | 'dark';
  background: WidgetColor;
  accents: [WidgetColor, WidgetColor, WidgetColor];
};
export const WIDGET_COLOR_NAMES = Object.keys(WIDGET_COLORS) as WidgetColor[];

const text = {
  light: { foreground: '#24252A', secondary: '#5A5659', onAccent: '#FFFFFF' },
  dark: { foreground: '#F2F2F3', secondary: '#C2BDC6', onAccent: '#101114' },
};

/** Resolves chosen color names to fixed shades; body text remains automatic and legible. */
export function widgetPalette(choice: WidgetColorChoice) {
  const [background, gradientEnd] = WIDGET_COLORS[choice.background][choice.scheme];
  const accents = choice.accents.map((name) => WIDGET_COLORS[name][choice.scheme][2]);
  return { scheme: choice.scheme, background, gradientEnd, accents, ...text[choice.scheme] };
}

/** Checks a model-provided color name against the supported vocabulary. */
export function isWidgetColor(value: unknown): value is WidgetColor {
  return typeof value === 'string' && Object.hasOwn(WIDGET_COLORS, value);
}

/** Validates the color portion of a generated appearance, including stale previews after a schema update. */
export function isWidgetColorChoice(value: unknown): value is WidgetColorChoice {
  if (!value || typeof value !== 'object') return false;
  const choice = value as Partial<WidgetColorChoice>;
  return (
    (choice.scheme === 'light' || choice.scheme === 'dark') &&
    isWidgetColor(choice.background) &&
    Array.isArray(choice.accents) &&
    choice.accents.length === 3 &&
    choice.accents.every(isWidgetColor)
  );
}
