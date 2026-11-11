import { useEffect, useRef, useState } from 'react';
import { AppState, PixelRatio, type LayoutChangeEvent } from 'react-native';
import type { CanvasRef } from 'react-native-webgpu';
import { tgpu, d } from 'typegpu';

import {
  EFFECT_CHOICES,
  SHADER_PALETTES,
  type ShaderConfig,
} from '@/lib/shader-chat/shader-config';
import { SHADER_TEMPLATE } from '@/lib/shader-chat/shader-template';

const Params = d.struct({
  resolution: d.vec2f,
  time: d.f32,
  effect: d.f32,
  colorA: d.vec4f,
  colorB: d.vec4f,
  scale: d.f32,
  speed: d.f32,
  intensity: d.f32,
  rotation: d.f32,
});

/**
 * Owns a native TypeGPU surface and only updates trusted uniform values.
 * @param config Validated effect settings, never executable source.
 * @param paused Whether animation time should stay fixed; backgrounding also pauses it.
 * @returns Canvas ref, layout callback and renderer error. Unmount releases the GPU resources.
 */
export function useShaderCanvas(config: ShaderConfig, paused: boolean) {
  const ref = useRef<CanvasRef>(null);
  const latest = useRef({ config, paused });
  useEffect(() => {
    latest.current = { config, paused };
  }, [config, paused]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setSize((old) =>
      old.width === layout.width && old.height === layout.height
        ? old
        : { width: layout.width, height: layout.height }
    );
  };
  useEffect(() => {
    if (!size.width || !size.height) return;
    let disposed = false,
      frame = 0;
    let cleanup: (() => void) | undefined;
    const start = async () => {
      const context = ref.current?.getContext('webgpu');
      if (!context) throw new Error('The native GPU canvas is unavailable.');
      const root = await tgpu.init();
      if (disposed) {
        root.destroy();
        return;
      }
      const device = root.device;
      const uniform = root.createBuffer(Params).$usage('uniform');
      cleanup = () => {
        context.unconfigure();
        uniform.destroy();
        root.destroy();
      };
      const format = navigator.gpu.getPreferredCanvasFormat();
      const width = Math.max(1, Math.round(size.width * PixelRatio.get()));
      const height = Math.max(1, Math.round(size.height * PixelRatio.get()));
      context.canvas.width = width;
      context.canvas.height = height;
      context.configure({ device, format, alphaMode: 'opaque' });
      const module = device.createShaderModule({ code: SHADER_TEMPLATE });
      const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module, entryPoint: 'vertex_main' },
        fragment: { module, entryPoint: 'fragment_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
      if (disposed) return;
      const group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: root.unwrap(uniform) } }],
      });
      let elapsed = 0,
        previous: number | undefined;
      const draw = (timestamp: number) => {
        if (disposed) return;
        const { config: current, paused: stopped } = latest.current;
        const visible = AppState.currentState === 'active';
        if (previous !== undefined && visible && !stopped)
          elapsed += Math.min((timestamp - previous) / 1000, 0.1);
        previous = timestamp;
        try {
          if (visible) {
            const colors = SHADER_PALETTES[current.palette];
            uniform.write({
              resolution: d.vec2f(width, height),
              time: elapsed,
              effect: EFFECT_CHOICES.effect.indexOf(current.effect),
              colorA: d.vec4f(colors[0][0], colors[0][1], colors[0][2], 1),
              colorB: d.vec4f(colors[1][0], colors[1][1], colors[1][2], 1),
              scale: current.scale,
              speed: current.speed,
              intensity: current.intensity,
              rotation: current.rotation,
            });
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass({
              colorAttachments: [
                {
                  view: context.getCurrentTexture().createView(),
                  loadOp: 'clear',
                  storeOp: 'store',
                  clearValue: { r: 0, g: 0, b: 0, a: 1 },
                },
              ],
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, group);
            pass.draw(3);
            pass.end();
            device.queue.submit([encoder.finish()]);
            context.present();
          }
          frame = requestAnimationFrame(draw);
        } catch (cause) {
          if (!disposed) setError(cause instanceof Error ? cause.message : String(cause));
        }
      };
      frame = requestAnimationFrame(draw);
    };
    void start().catch((cause: unknown) => {
      if (!disposed) setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [size.width, size.height]);
  return { ref, onLayout, error };
}
