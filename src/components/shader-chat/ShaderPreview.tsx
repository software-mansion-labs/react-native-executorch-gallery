import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Canvas } from 'react-native-webgpu';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { ChatDisclosure } from '@/components/chat/ChatDisclosure';
import { ChatText } from '@/components/chat/ChatText';
import { useShaderCanvas } from '@/hooks/shader-chat/useShaderCanvas';
import type { ShaderConfig } from '@/lib/shader-chat/shader-config';
import type { ShaderGraph } from '@/lib/shader-chat/shader-graph';
import type { ShaderTree } from '@/lib/shader-chat/shader-tree';
import { tokens, useTheme } from '@/theme';

/** Inline native GPU effect with inspectable model-generated settings and accessible pause control. */
export function ShaderPreview({
  config,
  source,
}: {
  config: ShaderConfig | ShaderGraph | ShaderTree;
  source: string;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(reduceMotion);
  const { ref: canvasRef, onLayout, error } = useShaderCanvas(config, paused);
  return (
    <View style={styles.root}>
      <View style={[styles.preview, { backgroundColor: colors.background }]}>
        <Canvas
          ref={canvasRef}
          onLayout={onLayout}
          style={styles.canvas}
          accessible
          accessibilityLabel={
            'nodes' in config || 'color' in config
              ? 'Generated shader graph preview'
              : `${config.palette} ${config.effect} effect`
          }
        />
      </View>
      <View style={styles.actions}>
        <AppText variant="caption" tone="muted">
          {paused ? 'Paused' : 'Live preview'}
        </AppText>
        <IconButton
          icon={paused ? 'play' : 'pause'}
          accessibilityLabel={paused ? 'Play effect' : 'Pause effect'}
          onPress={() => setPaused((value) => !value)}
          tone="muted"
        />
      </View>
      {error && (
        <AppText variant="secondary" style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <ChatDisclosure
        icon="tool"
        label={
          'color' in config
            ? 'Shader expression'
            : 'nodes' in config
              ? 'Shader graph'
              : 'Effect settings'
        }
        onToggle={() => {}}
      >
        {'nodes' in config || 'color' in config ? (
          <ScrollView style={styles.programSource} nestedScrollEnabled>
            <ChatText>{`\`\`\`json\n${JSON.stringify(JSON.parse(source), null, 2)}\n\`\`\``}</ChatText>
          </ScrollView>
        ) : (
          <ChatText>{`\`\`\`json\n${JSON.stringify(JSON.parse(source), null, 2)}\n\`\`\``}</ChatText>
        )}
      </ChatDisclosure>
    </View>
  );
}

const { spacing, radius } = tokens;
const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  programSource: { maxHeight: tokens.layout.shaderSourceMaxHeight },
  preview: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: radius.card },
  canvas: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
