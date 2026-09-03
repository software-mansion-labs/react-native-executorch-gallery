import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { borderWidth, radius, spacing, useTheme, tints } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';

type Task = {
  href: string;
  title: string;
  subtitle: string;
  model: string;
  iconName: IconName;
  tint: keyof typeof tints;
  ready?: boolean;
};

type Section = {
  title: string;
  tasks: Task[];
};

const SECTIONS: Section[] = [
  {
    title: 'Computer Vision',
    tasks: [
      {
        href: '/instance-segmentation',
        title: 'Instance Segmentation',
        subtitle: 'Detect and mask individual object instances',
        model: 'YOLO26 Nano',
        iconName: 'overlappingCircles',
        tint: 'purple',
        ready: true,
      },
      {
        href: '/keypoint-detection',
        title: 'Pose Estimation',
        subtitle: 'Estimate 17 human body skeletal keypoints',
        model: 'YOLO26 Pose',
        iconName: 'person',
        tint: 'cyan',
        ready: true,
      },
      {
        href: '/ocr',
        title: 'OCR Text Recognition',
        subtitle: 'Detect and read multilingual text in photos',
        model: 'PaddleOCR PP-OCRv6',
        iconName: 'textDoc',
        tint: 'blue',
        ready: true,
      },
      {
        href: '/style-transfer',
        title: 'Style Transfer',
        subtitle: 'Transform photos into artistic paintings',
        model: 'Mosaic Style',
        iconName: 'palette',
        tint: 'pink',
        ready: true,
      },
      {
        href: '/object-detection',
        title: 'Object Detection',
        subtitle: 'Locate and classify multiple objects in photos',
        model: 'SSDLite MobileNetV3',
        iconName: 'scan',
        tint: 'green',
        ready: true,
      },
      {
        href: '/semantic-segmentation',
        title: 'Semantic Segmentation',
        subtitle: 'Segment objects by class with pixel-level masks',
        model: 'DeepLabV3 ResNet50',
        iconName: 'splitMask',
        tint: 'red',
        ready: true,
      },
      {
        href: '/image-classification',
        title: 'Image Classification',
        subtitle: 'Identify 1,000 object categories with confidence',
        model: 'EfficientNetV2-S',
        iconName: 'eye',
        tint: 'orange',
        ready: true,
      },
    ],
  },
  {
    title: 'Real Time',
    tasks: [
      {
        href: '/realtime-object-detection',
        title: 'Live Object Detection',
        subtitle: 'Continuous camera detection using VisionCamera',
        model: 'SSDLite MobileNetV3',
        iconName: 'videocam',
        tint: 'green',
        ready: true,
      },
    ],
  },
  {
    title: 'Generative AI',
    tasks: [
      {
        href: '/llm-chat',
        title: 'LLM Chat',
        subtitle: 'Interactive on-device conversational assistant',
        model: 'LFM 2.5 1.2B',
        iconName: 'chat',
        tint: 'neutral',
        ready: true,
      },
      {
        href: '/text-to-image',
        title: 'Text to Image',
        subtitle: 'Generate synthetic imagery from natural language prompts',
        model: 'SDXS 512 DreamShaper',
        iconName: 'sparkle',
        tint: 'pink',
        ready: true,
      },
    ],
  },
  {
    title: 'Audio & Speech',
    tasks: [
      {
        href: '/text-to-speech',
        title: 'Text to Speech',
        subtitle: 'Expressive neural voice synthesis',
        model: 'Kokoro 82M',
        iconName: 'audio',
        tint: 'purple',
        ready: true,
      },
      {
        href: '/speech-to-text',
        title: 'Speech to Text',
        subtitle: 'Multi-lingual automatic speech recognition',
        model: 'Whisper Tiny',
        iconName: 'mic',
        tint: 'cyan',
        ready: true,
      },
      {
        href: '/voice-activity-detection',
        title: 'Voice Activity Detection',
        subtitle: 'Detect speech segments in real-time audio streams',
        model: 'FSMN VAD',
        iconName: 'pulse',
        tint: 'blue',
        ready: true,
      },
    ],
  },
  {
    title: 'Embeddings & Search',
    tasks: [
      {
        href: '/image-embeddings',
        title: 'Multimodal Search',
        subtitle: 'Rank text queries against images with CLIP',
        model: 'CLIP ViT-B/32',
        iconName: 'search',
        tint: 'orange',
        ready: true,
      },
    ],
  },
  {
    title: 'Natural Language Processing',
    tasks: [
      {
        href: '/privacy-filter',
        title: 'Privacy Filter',
        subtitle: 'Detect and redact personally identifiable information in text',
        model: 'OpenAI PII Detector',
        iconName: 'shield',
        tint: 'green',
        ready: true,
      },
    ],
  },
];

export default function Home() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Block */}
      <View style={styles.header}>
        <Image
          source={
            scheme === 'dark'
              ? require('../../assets/images/logo-horizontal-dark.svg')
              : require('../../assets/images/logo-horizontal.svg')
          }
          style={styles.brandImage}
          contentFit="contain"
        />
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          Explore on-device machine learning with React Native ExecuTorch. Every task runs entirely
          on your phone — no data leaves the device. Models are downloaded on first use, then run
          fully offline. Try each model live and see how fast on-device inference really is.
        </Text>
      </View>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: spacing.sm + 2 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            {section.tasks.map((task) => (
              <TaskCard key={task.href} task={task} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const isAvailable = task.ready !== false;
  const tintKey = scheme === 'dark' ? (`${task.tint}Dark` as keyof typeof tints) : task.tint;
  const tint = tints[tintKey] ?? tints[task.tint];

  return (
    <Pressable
      onPress={() => {
        if (isAvailable) {
          router.push(task.href as never);
        }
      }}
      disabled={!isAvailable}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: !isAvailable ? 0.55 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed && isAvailable ? 0.985 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.iconTile,
          isAvailable
            ? { backgroundColor: tint + '14', borderColor: tint + '30' }
            : { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
        ]}
      >
        <Icon
          name={task.iconName}
          size={22}
          color={isAvailable ? tint : colors.textSecondary}
          strokeWidth={2}
        />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{task.title}</Text>
          {!isAvailable ? (
            <View
              style={[
                styles.soonBadge,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              <Text style={[styles.soonText, { color: colors.textMuted }]}>Planned</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.cardSubtitle, { color: colors.textDim }]}>{task.subtitle}</Text>

        <View
          style={[
            styles.modelTag,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
          ]}
        >
          <Text style={[styles.modelText, { color: colors.textSecondary }]}>{task.model}</Text>
        </View>
      </View>

      {isAvailable ? (
        <Icon name="chevronRight" size={16} color={colors.textMuted} strokeWidth={2.5} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  brandImage: {
    width: '68%',
    aspectRatio: 1139.63 / 332,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
    textAlign: 'justify',
  },
  sectionHeader: { gap: 2, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth,
  },
  cardBody: { flex: 1, gap: 3 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardSubtitle: { fontSize: 12, lineHeight: 16 },
  modelTag: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth,
  },
  modelText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
  soonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth,
  },
  soonText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
});
