/** Adapted from the library example: depth-aware focus blur on the original photograph. */
export const DEPTH_FOCUS_SHADER = `
uniform shader photo;
uniform shader depth;
uniform float2 origin;
uniform float2 size;
uniform float2 focus;
uniform float amount;
uniform float reveal;

float depthAt(float2 uv) {
  return depth.eval(origin + clamp(uv, 0.0, 1.0) * size).r;
}

half4 photoAt(float2 uv) {
  return photo.eval(origin + clamp(uv, 0.0, 1.0) * size);
}

half4 main(float2 position) {
  float2 uv = (position - origin) / size;
  float difference = abs(depthAt(uv) - depthAt(focus));
  float radius = smoothstep(0.02, 0.55, difference) * amount * 18.0;
  half4 color = half4(0.0);
  float totalWeight = 0.0;
  // A weighted spiral avoids the repeated edges of a sparse blur ring.
  for (int i = 0; i < 32; i++) {
    float r = sqrt((float(i) + 0.5) / 32.0);
    float angle = float(i) * 2.399963;
    float weight = exp(-2.0 * r * r);
    float2 offset = float2(cos(angle), sin(angle)) * r * radius / size;
    color += photoAt(uv + offset) * weight;
    totalWeight += weight;
  }
  return mix(photoAt(uv), color / totalWeight, reveal);
}
`;
