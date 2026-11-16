/** Shared geometric radius, relative to half the canvas size. */
export const OMNI_ORB_RADIUS = 0.665;
/** Contains the largest harmonic deformation without making the whole canvas clickable. */
export const OMNI_ORB_MAX_RADIUS = OMNI_ORB_RADIUS * 1.12;

/** Computes the regular, gently drifting harmonic outline without speech input. */
export function omniOrbShape(time: number, activity: number) {
  'worklet';
  const amplitude = 0.105 + activity * 0.025 + Math.sin(time * 1.1) * 0.008;
  const a4 = 0.625836 * 0.25 * amplitude;
  const a5 = 0.656382 * 0.45 * amplitude;
  const a7 = 0.707163 * 0.3 * amplitude;
  return {
    lobes: [a4, a5, a7, OMNI_ORB_RADIUS / Math.sqrt(1 + (a4 * a4 + a5 * a5 + a7 * a7) / 2)],
    phases: [time * 0.75, -time * 0.57 + 1.1, time * 0.91 + 2.2, 0],
  };
}

/** Uses the same harmonic coefficients as the shader for precise touch testing. */
export function omniOrbRadius(angle: number, time: number, activity: number) {
  'worklet';
  const { lobes, phases } = omniOrbShape(time, activity);
  return (
    lobes[3] *
    (1 +
      lobes[0] * Math.cos(4 * angle + phases[0]) +
      lobes[1] * Math.cos(5 * angle + phases[1]) +
      lobes[2] * Math.cos(7 * angle + phases[2]))
  );
}

/** Blue-and-white cloud orb with harmonic surface oscillation and a subtle glass rim. */
export const OMNI_ORB_SHADER = `
  uniform float size;
  uniform float time;
  uniform float swirl;
  uniform float4 lobes;
  uniform float4 phases;
  uniform float4 deep;
  uniform float4 mist;
  uniform float4 cloud;

  float surfaceRadius(float angle) {
    // Regular independent harmonics, shared with touch geometry.
    return lobes.w * (1.0 + lobes.x * cos(4.0 * angle + phases.x)
                         + lobes.y * cos(5.0 * angle + phases.y)
                         + lobes.z * cos(7.0 * angle + phases.z));
  }

  float clouds(float2 p) {
    // Smooth bounded waves avoid fract-of-large-number hashing, whose small
    // numerical differences produced faceted patches on the Pixel GPU.
    float a = sin(p.x * 1.37 + sin(p.y * 1.81) * 0.7);
    float b = cos(p.y * 2.13 - sin(p.x * 1.57) * 0.8 + 1.4);
    float c = sin(p.x * 3.11 - p.y * 2.47 + sin(p.x + p.y) * 0.6);
    return 0.5 + 0.5 * (a * 0.5 + b * 0.32 + c * 0.18);
  }
  half4 main(float2 pixel) {
    float2 p = (pixel / size - 0.5) * 2.0;
    float dist = length(p);
    float angle = atan(p.y, p.x);
    float radius = surfaceRadius(angle);
    float mask = 1.0 - smoothstep(radius - 1.0 / size, radius + 1.0 / size, dist);
    if (mask <= 0.0) return half4(0.0);
    float2 q = p / radius;
    // Broad drifting cloud masses; fine noise only softens their boundaries.
    float t = time * 0.75;
    float rotation = sin(t * 0.7) * 0.2 + swirl * sin(t) * 0.24;
    q = float2(q.x * cos(rotation) - q.y * sin(rotation),
               q.x * sin(rotation) + q.y * cos(rotation));
    float2 drift = float2(t * 0.55, -t * 0.32);
    float bend = sin(q.y * 2.0 + t) * (0.24 + swirl * 0.2);
    float2 uv = q * 1.8 + float2(bend, sin(q.x * 1.9 - t * 0.8) * (0.3));
    float billow = clouds(uv + drift + 4.0);
    float boundary = -0.1 + (billow - 0.5) * 1.1 + sin(q.x * 2.3 + t) * 0.24
                   + cos(q.x * 4.7 - t * 0.6) * 0.08;
    float blue = smoothstep(boundary - 0.32, boundary + 0.4, q.y);
    float3 color = mix(cloud.rgb, mist.rgb, blue);
    float depths = smoothstep(0.05, 1.0, q.y + (billow - 0.5) * 0.65);
    color = mix(color, deep.rgb, depths * 0.95);
    float vapor = billow * 0.7 + 0.3 * (0.5 + 0.5 * sin(uv.x * 2.1 + uv.y * 1.7 - t * 0.4));
    float wisps = smoothstep(0.43, 0.72, vapor + q.x * 0.08 - q.y * 0.12);
    color = mix(color, cloud.rgb, wisps * 0.55);
    // A narrow glass reflection catches one moving crescent, with a quieter
    // reflection opposite it. Both follow the deformed silhouette.
    float2 direction = p / max(dist, 0.001);
    float2 light = normalize(float2(-0.7 + sin(time * 0.2) * 0.18, -0.65));
    float facing = dot(direction, light);
    float edgeDepth = max(0.0, 1.0 - dist / radius);
    float rim = 1.0 - smoothstep(0.0, 0.035, edgeDepth);
    float crescent = smoothstep(0.25, 1.0, facing);
    float reflection = smoothstep(0.4, 1.0, -facing);
    color = mix(color, cloud.rgb, rim * (0.06 + crescent * 0.38));
    color = mix(color, mist.rgb, rim * reflection * 0.16);
    float innerRim = 1.0 - smoothstep(0.0, 0.014, abs(dist / radius - 0.963));
    color = mix(color, cloud.rgb, innerRim * crescent * 0.12);
    return half4(color * mask, mask);
  }
`;
