import { Gesture } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { ForegroundBumper } from '@/lib/photo-pinball/foreground-bumper';

const ballRadiusRatio = 0.026;
const bumperRadiusRatio = 0.055;

/**
 * Simulates a ball in photo-local coordinates and handles flicks and straight shots.
 * @param width Width of the displayed photo.
 * @param height Height of the displayed photo.
 * @param origin Top-left corner of the displayed photo within the canvas.
 * @param occlusion Whether the depth texture should mask the ball.
 * @param foreground Estimated footprint of the photographed object.
 * @returns Gestures, bumper geometry, and animated shader uniforms.
 */
export function usePhotoPinball(
  width: number,
  height: number,
  origin: [number, number],
  occlusion: boolean,
  foreground: ForegroundBumper | null
) {
  const size = Math.min(width, height);
  const radius = ballRadiusRatio * size;
  const startX = width * 0.5;
  const startY = height * 0.84;
  const ball = useSharedValue({ x: startX, y: startY, vx: 0, vy: 0, time: 0 });
  const bumpers = [
    { x: width * 0.23, y: height * 0.26, radius: size * bumperRadiusRatio },
    { x: width * 0.77, y: height * 0.34, radius: size * bumperRadiusRatio },
  ];

  const colliders = foreground
    ? [
        ...bumpers,
        { x: foreground.x * width, y: foreground.y * height, radius: foreground.radius * size },
      ]
    : bumpers;

  const launch = (vx: number, vy: number) => {
    'worklet';
    const scale = Math.min(1, (size * 2.2) / Math.hypot(vx, vy));
    ball.set({ x: startX, y: startY, vx: vx * scale, vy: vy * scale, time: 0.001 });
  };

  const straightShot = () => {
    'worklet';
    launch(0, -height * 0.95);
  };

  const pan = Gesture.Pan().onEnd(({ velocityX, velocityY, translationX, translationY }) => {
    const vx = velocityX * 0.45 + translationX * 3;
    const vy = velocityY * 0.45 + translationY * 3;
    launch(vx, Math.min(vy, -height * 0.58));
  });
  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) straightShot();
  });

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const current = ball.get();
    if (!timeSincePreviousFrame || current.time === 0) return;
    const dt = Math.min(timeSincePreviousFrame / 1000, 1 / 50);
    let { x, y, vx, vy, time } = current;
    time += dt;
    vy += height * 0.44 * dt;
    x += vx * dt;
    y += vy * dt;
    const right = width - radius;
    if (x < radius || x > right) {
      x = Math.max(radius, Math.min(right, x));
      vx *= -0.84;
    }
    if (y < radius) {
      y = radius;
      vy = Math.abs(vy) * 0.84;
    }
    for (const bumper of colliders) {
      const dx = x - bumper.x;
      const dy = y - bumper.y;
      const distance = Math.hypot(dx, dy);
      const contact = bumper.radius + radius;
      if (distance === 0 || distance >= contact) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      const inwardSpeed = Math.min(0, vx * nx + vy * ny);
      x = bumper.x + nx * contact;
      y = bumper.y + ny * contact;
      vx -= 2.08 * inwardSpeed * nx;
      vy -= 2.08 * inwardSpeed * ny;
    }
    ball.set(
      y > height + radius || time > 9
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
      useDepth: occlusion ? 1 : 0,
    };
  });

  return { gesture: Gesture.Race(pan, tap), straightShot, bumpers, uniforms };
}
