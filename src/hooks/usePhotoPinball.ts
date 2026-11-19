import { Gesture } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import type { ForegroundBumper } from '@/lib/photo-pinball/foreground-bumper';

const ballRadiusRatio = 0.026;

/**
 * Simulates a swiped or reproducible shot at the estimated object footprint.
 * @param width Width of the displayed photo.
 * @param height Height of the displayed photo.
 * @param origin Top-left corner of the displayed photo within the canvas.
 * @param foreground Estimated footprint of the photographed object.
 * @returns Swipe gesture, test launch action, and animated shader uniforms.
 */
export function usePhotoPinball(
  width: number,
  height: number,
  origin: [number, number],
  foreground: ForegroundBumper | null
) {
  const size = Math.min(width, height);
  const radius = ballRadiusRatio * size;
  const startX = width * 0.5;
  const startY = height * 0.84;
  const ball = useSharedValue({ x: startX, y: startY, vx: 0, vy: 0, time: 0 });
  const bumper = foreground
    ? { x: foreground.x * width, y: foreground.y * height, radius: foreground.radius * size }
    : null;
  const gravity = height * 0.44;

  const launch = (vx: number, vy: number) => {
    'worklet';
    const speed = Math.hypot(vx, vy);
    if (speed === 0) return;
    const scale = Math.min(1, (size * 2.2) / speed);
    ball.set({ x: startX, y: startY, vx: vx * scale, vy: vy * scale, time: 0.001 });
  };

  const runTest = () => {
    'worklet';
    if (!bumper) return;
    const duration = 0.55;
    const vx = (bumper.x - startX) / duration;
    const vy = (bumper.y - startY) / duration - (gravity * duration) / 2;
    launch(vx, vy);
  };

  const swipe = Gesture.Pan()
    .minDistance(8)
    .maxPointers(1)
    .onEnd(({ x, y, translationX, translationY, velocityX, velocityY }, success) => {
      const startX = x - translationX - origin[0];
      const startY = y - translationY - origin[1];
      if (!success || startX < 0 || startX > width || startY < 0 || startY > height) return;
      const distance = Math.hypot(translationX, translationY);
      if (distance === 0) return;
      const speed = distance * 3 + Math.hypot(velocityX, velocityY) * 0.45;
      launch((translationX / distance) * speed, (translationY / distance) * speed);
    });

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const current = ball.get();
    if (!timeSincePreviousFrame || current.time === 0) return;
    const dt = Math.min(timeSincePreviousFrame / 1000, 1 / 50);
    let { x, y, vx, vy, time } = current;
    time += dt;
    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;
    if (bumper) {
      const dx = x - bumper.x;
      const dy = y - bumper.y;
      const distance = Math.hypot(dx, dy);
      const contact = bumper.radius + radius;
      if (distance > 0 && distance < contact) {
        const nx = dx / distance;
        const ny = dy / distance;
        const inwardSpeed = Math.min(0, vx * nx + vy * ny);
        x = bumper.x + nx * contact;
        y = bumper.y + ny * contact;
        vx -= 2.08 * inwardSpeed * nx;
        vy -= 2.08 * inwardSpeed * ny;
      }
    }
    ball.set(
      y > height + radius || y < -radius || x < -radius || x > width + radius || time > 5
        ? { x: startX, y: startY, vx: 0, vy: 0, time: 0 }
        : { x, y, vx, vy, time }
    );
  });

  const uniforms = useDerivedValue(() => {
    const state = ball.get();
    return {
      origin,
      size: [width, height],
      center: state.time > 0 ? [state.x, state.y] : [startX, startY],
      radius,
    };
  });

  return { swipe, runTest: () => scheduleOnUI(runTest), uniforms };
}
