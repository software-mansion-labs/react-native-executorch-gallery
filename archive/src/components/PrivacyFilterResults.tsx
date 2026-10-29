import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nlp } from 'react-native-executorch';

import { borderWidth, piiColors, radius, spacing, useTheme } from '@/theme';

export interface PrivacyFilterResultsProps {
  /** The original text the entities were detected in. */
  text: string;
  /** Detected PII entity spans, in order. */
  entities: nlp.PiiEntity[];
}

/** Hashes an entity label to a stable tinted color pair. */
function colorForLabel(label: string): (typeof piiColors)[number] {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) % piiColors.length;
  }
  return piiColors[hash]!;
}

/**
 * Renders the scanned text with entity spans highlighted.
 *
 * Library char offsets may include surrounding whitespace, so each span is
 * trimmed before highlighting to avoid a leading-space offset.
 */
function renderHighlighted(text: string, entities: nlp.PiiEntity[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  const ordered = [...entities].sort((a, b) => a.charStart - b.charStart);

  for (const entity of ordered) {
    const raw = text.slice(entity.charStart, entity.charEnd);
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = entity.charStart + (raw.length - raw.trimStart().length);

    if (start > cursor) nodes.push(text.slice(cursor, start));
    const tint = colorForLabel(entity.label);
    nodes.push(
      <Text key={entity.charStart} style={{ backgroundColor: tint.bg, color: tint.fg }}>
        {trimmed}
      </Text>
    );
    cursor = start + trimmed.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/**
 * Renders privacy-filter output: the source text with PII spans highlighted in
 * per-category pastel colors, plus a list of the detected entities and types.
 *
 * @param props The scanned text and the detected entity spans.
 * @returns The annotated text card and entity list, or nothing if empty.
 */
export function PrivacyFilterResults({ text, entities }: PrivacyFilterResultsProps) {
  const { colors } = useTheme();
  if (entities.length === 0) return null;

  const highlighted = renderHighlighted(text, entities);

  return (
    <>
      <View
        style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Annotated Text</Text>
        <Text style={[styles.previewText, { color: colors.text }]}>{highlighted}</Text>
      </View>

      <View style={styles.results}>
        <Text style={[styles.resultsTitle, { color: colors.textMuted }]}>
          Detected {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
        </Text>
        {entities.map((entity, i) => (
          <View
            key={`${entity.label}-${entity.charStart}-${i}`}
            style={[
              styles.entityRow,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={[styles.badge, { backgroundColor: colorForLabel(entity.label).bg }]}>
              <Text style={[styles.badgeText, { color: colorForLabel(entity.label).fg }]}>
                {entity.label}
              </Text>
            </View>
            <Text style={[styles.entityText, { color: colors.text }]} numberOfLines={1}>
              {entity.text}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 14,
    lineHeight: 22,
  },
  results: {
    gap: spacing.sm,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  entityText: {
    flex: 1,
    fontSize: 13,
  },
});
