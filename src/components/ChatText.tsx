import { Linking } from 'react-native';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';

import { normalizeChatMarkdown } from '@/lib/chat-markdown';
import { useTheme } from '@/theme';

/** Renders selectable chat markdown and LaTeX equations using native text views. */
export function ChatText({ children, muted = false }: { children: string; muted?: boolean }) {
  const { colors, typography, fontFamily, spacing, radius, borderWidth } = useTheme();
  const color = muted ? colors.muted : colors.text;
  const body = {
    ...typography[muted ? 'secondary' : 'body'],
    fontFamily,
    color,
    marginTop: spacing.none,
    marginBottom: spacing.md,
  };
  const heading = { ...body, ...typography.title };

  return (
    <EnrichedMarkdownText
      markdown={normalizeChatMarkdown(children)}
      flavor="github"
      selectable
      streamingAnimation
      md4cFlags={{ latexMath: true, hardSoftBreaks: true }}
      onLinkPress={({ url }) => {
        if (/^https?:\/\//i.test(url)) void Linking.openURL(url).catch(() => {});
      }}
      markdownStyle={{
        paragraph: body,
        h1: { ...heading, ...typography.heading },
        h2: heading,
        h3: heading,
        h4: heading,
        h5: heading,
        h6: heading,
        list: { ...body, bulletColor: color, markerColor: color, gapWidth: spacing.sm },
        link: { color: colors.accent, underline: true },
        strong: { color },
        em: { color },
        blockquote: { ...body, borderColor: colors.border, borderWidth: borderWidth.thin },
        code: { color, backgroundColor: colors.background, fontSize: body.fontSize },
        codeBlock: {
          ...body,
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: borderWidth.thin,
          borderRadius: radius.annotation,
          padding: spacing.md,
        },
        math: {
          color,
          fontSize: body.fontSize,
          backgroundColor: colors.surface,
          padding: spacing.sm,
          marginTop: spacing.none,
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        inlineMath: { color },
        table: {
          ...body,
          borderColor: colors.border,
          borderWidth: borderWidth.thin,
          headerTextColor: color,
          headerBackgroundColor: colors.background,
          rowEvenBackgroundColor: colors.surface,
          rowOddBackgroundColor: colors.surface,
          cellPaddingHorizontal: spacing.sm,
          cellPaddingVertical: spacing.sm,
        },
        thematicBreak: { color: colors.border, height: borderWidth.thin },
      }}
    />
  );
}
