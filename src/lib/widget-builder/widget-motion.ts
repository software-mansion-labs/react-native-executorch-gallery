import { FadeInDown, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { tokens } from '@/theme';

/** Gentle reveal for newly generated elements; values and selections retain their existing views. */
export const widgetReveal = (index = 0) =>
  FadeInDown.duration(tokens.motion.photoRevealDuration)
    .delay(Math.min(index, 4) * tokens.motion.searchPhotoStaggerDuration)
    .withInitialValues({ opacity: 0, transform: [{ translateY: tokens.spacing.sm }] })
    .reduceMotion(ReduceMotion.System);
export const widgetExit = FadeOut.duration(tokens.motion.chatDisclosureFadeDuration).reduceMotion(
  ReduceMotion.System
);
export const widgetExpansion = LinearTransition.duration(
  tokens.motion.chatDisclosureDuration
).reduceMotion(ReduceMotion.System);
