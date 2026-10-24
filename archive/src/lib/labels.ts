/** A stable, pleasant color per class label (used by overlays and result rows). */
const COLORS = [
  '#2A47FF',
  '#001A72',
  '#38ACDD',
  '#57B495',
  '#FF6259',
  '#F59E0B',
  '#4B6CF4',
  '#33488E',
];

export function domainColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
