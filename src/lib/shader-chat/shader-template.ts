/** Trusted WGSL: the model only selects uniforms and can never replace this source. */
export const SHADER_TEMPLATE = `
struct Params {
  resolution: vec2f, time: f32, effect: f32,
  colorA: vec4f, colorB: vec4f,
  scale: f32, speed: f32, intensity: f32, rotation: f32,
}
@group(0) @binding(0) var<uniform> params: Params;
@vertex fn vertex_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let x = f32((index << 1u) & 2u); let y = f32(index & 2u);
  return vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let uv = position.xy / params.resolution;
  let centered = uv - vec2f(0.5);
  let angle = params.rotation * 0.01745329252;
  let rotated = vec2f(cos(angle) * centered.x - sin(angle) * centered.y,
                      sin(angle) * centered.x + cos(angle) * centered.y) + vec2f(0.5);
  let phase = params.time * params.speed * 2.0;
  let frequency = params.scale * 6.28318530718;
  var brightness: f32;
  if (params.effect < 0.5) {
    brightness = 0.5 + 0.5 * sin(length(centered) * frequency - phase);
  } else if (params.effect < 1.5) {
    let r1 = length(uv - vec2f(0.35, 0.5));
    let r2 = length(uv - vec2f(0.65, 0.5));
    brightness = 0.5 + 0.25 * (sin(r1 * frequency - phase) + sin(r2 * frequency - phase));
  } else if (params.effect < 2.5) {
    brightness = 0.5 + 0.5 * sin(rotated.x * frequency - phase);
  } else if (params.effect < 3.5) {
    let tile = floor(rotated * params.scale);
    brightness = select(0.0, 1.0, (tile.x + tile.y) % 2.0 == 0.0);
  } else if (params.effect < 4.5) {
    brightness = select(0.0, 1.0, length(centered) < 0.45 / sqrt(params.scale * 0.5));
  } else {
    brightness = clamp(rotated.x, 0.0, 1.0);
  }
  let contrast = clamp(0.5 + (brightness - 0.5) * params.intensity, 0.0, 1.0);
  return vec4f(mix(params.colorA.rgb, params.colorB.rgb, contrast), 1.0);
}`;
