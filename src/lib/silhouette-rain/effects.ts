import type { EffectId } from './physics';

export const EFFECTS: {
  id: EffectId;
  label: string;
  icon: 'rainy-outline' | 'snow-outline' | 'bonfire-outline' | 'flame-outline';
}[] = [
  { id: 'rain', label: 'Rain', icon: 'rainy-outline' },
  { id: 'snow', label: 'Snow', icon: 'snow-outline' },
  { id: 'embers', label: 'Embers', icon: 'bonfire-outline' },
  { id: 'lava', label: 'Lava', icon: 'flame-outline' },
];

// Metaball surfaces merge and separate; animated veins provide the molten interior.
export const LAVA_SHADER = `
uniform float2 resolution;
uniform float time;
uniform float3 balls[12];
uniform float3 cold;
uniform float3 warm;
uniform float3 hot;
half4 main(float2 p) {
  float2 uv = p / resolution.y;
  float field = 0.0;
  for (int i=0;i<12;i++) {
    float2 d=uv-balls[i].xy;
    field += balls[i].z*balls[i].z / (dot(d,d)+0.0003);
  }
  float wave=sin(uv.x*26.0+sin(uv.y*16.0+time*0.7)*2.0-time*0.4);
  wave+=0.5*sin(uv.y*44.0+sin(uv.x*32.0-time)*1.5+time);
  float surface=smoothstep(0.85,1.18,field);
  float heat=smoothstep(-0.7,1.15,wave);
  float rim=exp(-abs(field-1.05)*6.0);
  float3 color=mix(cold,warm,heat);
  color=mix(color,hot,clamp(heat*heat*0.55+rim*0.7,0.0,1.0));
  float alpha=surface*0.92+exp(-abs(field-0.95)*4.0)*0.15;
  return half4(color*alpha,alpha);
}`;
