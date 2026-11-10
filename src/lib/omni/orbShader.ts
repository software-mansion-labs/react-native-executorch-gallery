/** Shared geometric radius, relative to half the canvas size. */
export const OMNI_ORB_RADIUS = 0.665;
/** Contains the largest harmonic deformation without making the whole canvas clickable. */
export const OMNI_ORB_MAX_RADIUS = OMNI_ORB_RADIUS * 1.12;

/** Matches the shader's rotated real spherical harmonics for precise touch testing. */
export function omniOrbRadius(angle: number, time: number, energy: number, activity: number) {
  'worklet';
  const y44 = 0.625836 * Math.cos(4 * angle + time * 0.75);
  const y55 = 0.656382 * Math.cos(5 * angle - time * 0.57 + 1.1);
  const y77 = 0.707163 * Math.cos(7 * angle + time * 0.91 + 2.2);
  const harmonic = y44 * 0.25 + y55 * 0.45 + y77 * 0.3;
  const e = Math.max(0, Math.min(1, energy));
  const amplitude = 0.105 + activity * 0.025 + e * 0.025 + Math.sin(time * 1.1) * 0.008;
  // Different Fourier orders are orthogonal on the equator. This normalization
  // holds projected area steady while the independent lobes merge and separate.
  const meanSquare = ((0.625836 * 0.25) ** 2 + (0.656382 * 0.45) ** 2 + (0.707163 * 0.3) ** 2) / 2;
  return (
    (OMNI_ORB_RADIUS * (1 + harmonic * amplitude)) / Math.sqrt(1 + amplitude ** 2 * meanSquare)
  );
}

/** Blue-and-white cloud orb with harmonic surface oscillation and a subtle glass rim. */
export const OMNI_ORB_SHADER = `
  uniform float size;
  uniform float time;
  uniform float energy;
  uniform float activity;
  uniform float swirl;
  uniform float pulse;
  uniform float4 deep;
  uniform float4 mist;
  uniform float4 cloud;

  float surfaceRadius(float angle) {
    // Real sectoral Y(4,4), Y(5,5), Y(7,7) on the sphere's equator.
    // Several shallow traveling lobes keep the outline approximately round.
    float y44 = 0.625836 * cos(4.0 * angle + time * 0.75);
    float y55 = 0.656382 * cos(5.0 * angle - time * 0.57 + 1.1);
    float y77 = 0.707163 * cos(7.0 * angle + time * 0.91 + 2.2);
    float harmonic = y44 * 0.25 + y55 * 0.45 + y77 * 0.3;
    float e = clamp(energy, 0.0, 1.0);
    float amplitude = 0.105 + activity * 0.025 + e * 0.025 + sin(time * 1.1) * 0.008;
    float meanSquare = (pow(0.625836 * 0.25, 2.0) + pow(0.656382 * 0.45, 2.0)
                      + pow(0.707163 * 0.3, 2.0)) * 0.5;
    return ${OMNI_ORB_RADIUS} * (1.0 + harmonic * amplitude)
         / sqrt(1.0 + amplitude * amplitude * meanSquare);
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
    float e = clamp(energy, 0.0, 1.0);
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
    float bend = sin(q.y * 2.0 + t) * (0.24 + swirl * 0.2 + e * 0.35);
    float2 uv = q * 1.8 + float2(bend, sin(q.x * 1.9 - t * 0.8) * (0.3 + e * 0.22));
    float billow = clouds(uv + drift + 4.0);
    float boundary = -0.1 + (billow - 0.5) * 1.1 + sin(q.x * 2.3 + t) * 0.24
                   + cos(q.x * 4.7 - t * 0.6) * 0.08;
    float blue = smoothstep(boundary - 0.32, boundary + 0.4, q.y);
    float3 color = mix(cloud.rgb, mist.rgb, blue);
    float depths = smoothstep(0.05, 1.0, q.y + (billow - 0.5) * 0.65);
    color = mix(color, deep.rgb, depths * 0.95);
    float vapor = clouds(uv * 1.35 - drift * 0.8 + 11.0);
    float wisps = smoothstep(0.43, 0.72, vapor + q.x * 0.08 - q.y * 0.12);
    color = mix(color, cloud.rgb, wisps * (0.55 + e * 0.08));
    // A narrow glass reflection catches one moving crescent, with a quieter
    // reflection opposite it. Both follow the deformed silhouette.
    float2 direction = p / max(dist, 0.001);
    float2 light = normalize(float2(-0.7 + sin(time * 0.2) * 0.18, -0.65));
    float facing = dot(direction, light);
    float edgeDepth = max(0.0, 1.0 - dist / radius);
    float rim = exp(-edgeDepth * 65.0);
    float crescent = pow(max(facing, 0.0), 6.0);
    float reflection = pow(max(-facing, 0.0), 8.0);
    color = mix(color, cloud.rgb, rim * (0.06 + crescent * 0.38));
    color = mix(color, mist.rgb, rim * reflection * 0.16);
    float innerRim = exp(-pow((dist / radius - 0.963) * 90.0, 2.0));
    color = mix(color, cloud.rgb, innerRim * crescent * 0.12);
    float breath = pulse * 0.08 + activity * e * 0.04;
    color = mix(color, cloud.rgb, breath);
    return half4(color * mask, mask);
  }
`;
