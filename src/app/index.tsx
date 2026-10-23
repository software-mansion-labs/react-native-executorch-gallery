import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DestinationLink } from '@/components/home/DestinationLink';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeHeader } from '@/components/home/HomeHeader';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { tokens, useTheme } from '@/theme';

export default function HomeScreen() {
  const { colors, iconSize } = useTheme();
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader settingsVisible={settingsVisible} onSettings={() => setSettingsVisible(true)} />
        <View style={styles.body}>
          <HomeHero />
          <View style={styles.discovery}>
            <DestinationLink
              title="Talk it through"
              subtitle="Chat with a local model"
              icon="chatbubble-outline"
              query="chat"
            />
            <DestinationLink
              title="Look a little closer"
              subtitle="Explore computer vision"
              icon="camera-outline"
              query="vision"
            />
            <DestinationLink
              title="Find your voice"
              subtitle="Listen, transcribe, create"
              icon="mic-outline"
              query="speech"
            />
            <Pressable
              onPress={() => router.push('/tasks')}
              accessibilityRole="link"
              style={({ pressed }) => [styles.browse, pressed && styles.pressed]}
            >
              <AppText variant="body">Browse all demos</AppText>
              <Ionicons name="arrow-forward" size={iconSize.small} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </ScreenWrapper>
  );
}

const { spacing, layout, opacity } = tokens;

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.homeMaxWidth,
    alignSelf: 'center',
    paddingBottom: spacing.sm,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  discovery: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  browse: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
