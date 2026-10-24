import { StyleSheet, Text } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens } from '@/theme';

/** Preserves paragraphs and renders the model's inline emphasis in native, selectable text. */
export function ChatText({ children, muted = false }: { children: string; muted?: boolean }) {
  return (
    <AppText selectable variant={muted ? 'secondary' : 'body'} tone={muted ? 'muted' : 'text'}>
      {children.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, index) =>
        /^(\*\*|__)/.test(part) && part.length > 4 ? (
          <Text key={index} style={styles.emphasis}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        )
      )}
    </AppText>
  );
}

const styles = StyleSheet.create({ emphasis: { fontWeight: tokens.typography.title.fontWeight } });
