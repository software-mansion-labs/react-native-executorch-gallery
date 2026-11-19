import { Gesture } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import type { ForegroundBumper } from '@/lib/photo-pinball/foreground-bumper';
import {
  createTableProjection,
  photoToTable,
  tableToPhoto,
  type TableDepthGradient,
} from '@/lib/photo-pinball/table-plane';

const ballRadiusRatio = 0.026;

/**
 * Simulates a swiped or reproducible shot at the estimated object footprint.
 * @param width Width of the displayed photo.
 * @param height Height of the displayed photo.
 * @param origin Top-left corner of the displayed photo within the canvas.
 * @param foreground Estimated footprint of the photographed object.
 * @param gradient Inverse-depth gradient defining the approximate tabletop plane.
 * @returns Swipe gesture, test launch action, and animated shader uniforms.
 */
export function usePhotoPinball(
  width: number,
  height: number,
  origin: [number, number],
  foreground: ForegroundBumper | null,
  gradient: TableDepthGradient
) {
  const size = Math.min(width, height);
  const projection = createTableProjection(width, height, gradient);
  const photoStart = { x: width * 0.5, y: height * 0.84 };
  const start = photoToTable(photoStart.x, photoStart.y, projection);
  const idle = { ...start, vx: 0, vy: 0, time: 0 };
  const ball = useSharedValue(idle);
  const radius = ballRadiusRatio * size * tableToPhoto(start.x, start.y, projection).scale;
  const target = foreground
    ? photoToTable(foreground.x * width, foreground.y * height, projection)
    : null;
  const bumper =
    target && foreground
      ? {
          ...target,
          radius: foreground.radius * size * tableToPhoto(target.x, target.y, projection).scale,
        }
      : null;

  const launch = (vx: number, vy: number) => {
    'worklet';
    const speed = Math.hypot(vx, vy);
    if (speed === 0) return;
    const scale = Math.min(1, (size * 2.2) / speed);
    ball.set({ ...start, vx: vx * scale, vy: vy * scale, time: 0.001 });
  };

  const runTest = () => {
    'worklet';
    if (!bumper) return;
    const duration = 0.55;
    const vx = (bumper.x - start.x) / duration;
    const vy = (bumper.y - start.y) / duration;
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
      const step = 0.01 * size;
      const aim = photoToTable(
        photoStart.x + (translationX / distance) * step,
        photoStart.y + (translationY / distance) * step,
        projection
      );
      launch(((aim.x - start.x) * speed) / step, ((aim.y - start.y) * speed) / step);
    });

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const current = ball.get();
    if (!timeSincePreviousFrame || current.time === 0) return;
    const dt = Math.min(timeSincePreviousFrame / 1000, 1 / 50);
    let { x, y, vx, vy, time } = current;
    time += dt;
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
        vx -= 2 * inwardSpeed * nx;
        vy -= 2 * inwardSpeed * ny;
      }
    }
    const photo = tableToPhoto(x, y, projection);
    const outside =
      photo.scale <= 0 ||
      photo.y > height + radius ||
      photo.y < -radius ||
      photo.x < -radius ||
      photo.x > width + radius;
    ball.set(outside || time > 5 ? idle : { x, y, vx, vy, time });
  });

  const uniforms = useDerivedValue(() => {
    const state = ball.get();
    const photo =
      state.time > 0
        ? tableToPhoto(state.x, state.y, projection)
        : tableToPhoto(start.x, start.y, projection);
    return {
      origin,
      size: [width, height],
      center: [photo.x, photo.y],
      radius: radius / photo.scale,
    };
  });

  return { swipe, runTest: () => scheduleOnUI(runTest), uniforms };
}
