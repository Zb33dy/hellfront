import { Constants, Effect, ShaderMaterial, type Scene, type Texture, Vector2, Color3 } from '@babylonjs/core';
import { RENDER } from '../core/config';
import { ATLAS_COLS, ATLAS_ROWS } from './textures';

// One shader for the whole world: baked vertex light + N dynamic point lights,
// optional retro light banding, distance fog, atlas tiling, emissive mask.

const N = RENDER.maxDynamicLights;

Effect.ShadersStore['retroVertexShader'] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec4 color;
#ifdef ATLAS
attribute vec2 uv2;
varying vec2 vTile;
#endif
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUV;
varying vec4 vColor;
void main(void) {
  vec4 wp = world * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(world) * normal);
  vUV = uv;
  vColor = color;
#ifdef ATLAS
  vTile = uv2;
#endif
  gl_Position = viewProjection * wp;
}`;

Effect.ShadersStore['retroFragmentShader'] = `
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUV;
varying vec4 vColor;
#ifdef ATLAS
varying vec2 vTile;
uniform vec2 tileSize;
#endif
uniform sampler2D tex;
uniform vec3 lightPos[${N}];
uniform vec4 lightCol[${N}];
uniform vec3 eyePos;
uniform vec3 fogColor;
uniform vec2 fogRange;
uniform float time;
uniform float bands;
uniform float emissiveBoost;
uniform vec3 tintColor;
void main(void) {
  vec2 uv = vUV;
#ifdef ATLAS
  uv = vTile + fract(vUV) * tileSize;
#endif
#ifdef NUKAGE
  vec2 w = vec2(sin(vUV.y * 3.1 + time * 1.3), cos(vUV.x * 2.7 + time * 1.1)) * 0.035;
  uv = vUV + vec2(time * 0.045, time * 0.025) + w;
#endif
  vec4 t = texture2D(tex, uv);
#ifdef ALPHATEST
  if (t.a < 0.5) discard;
#endif
  vec3 light = vColor.rgb;
  for (int i = 0; i < ${N}; i++) {
    float range = lightCol[i].a;
    if (range <= 0.0) continue;
    vec3 d = lightPos[i] - vWorldPos;
    float dist = length(d);
    float att = clamp(1.0 - dist / range, 0.0, 1.0);
    att *= att;
#ifdef SPRITE
    float ndl = 1.0;
#else
    float ndl = max(dot(vNormal, d / max(dist, 0.001)), 0.0) * 0.85 + 0.15;
#endif
    light += lightCol[i].rgb * att * ndl;
  }
  light = max(light, vec3(0.0));
  float dist = length(vWorldPos - eyePos);
  if (bands > 0.0) {
    // Doom-style diminishing light, quantized into bands
    light *= mix(1.0, 0.45, smoothstep(6.0, 48.0, dist));
    // quantize brightness only (per-channel steps would create colour fringes)
    float lum = max(max(light.r, light.g), light.b);
    float q = floor(lum * bands + 0.35) / bands;
    light *= lum > 0.001 ? q / lum : 0.0;
  }
  vec3 col = t.rgb * light * tintColor;
#ifdef SPRITE
  // alpha 0.5..1 encodes emissive strength (1 = lit normally)
  float em = clamp((1.0 - t.a) * 2.02, 0.0, 1.0);
  col = mix(col, t.rgb * 1.8 * tintColor, em);
#endif
#ifdef ATLAS
  col += t.rgb * (1.0 - t.a) * emissiveBoost;
#endif
#ifdef NUKAGE
  col += t.rgb * emissiveBoost * (0.85 + 0.15 * sin(time * 2.0 + vUV.x * 1.7));
#endif
#ifdef FULLBRIGHT
  col = t.rgb * tintColor * vColor.rgb;
#endif
  float f = clamp((dist - fogRange.x) / (fogRange.y - fogRange.x), 0.0, 1.0);
  col = mix(col, fogColor, f * f * (3.0 - 2.0 * f) * 0.92);
  gl_FragColor = vec4(col, 1.0);
}`;

export type RetroKind = 'atlas' | 'nukage' | 'sprite' | 'decal';

export function createRetroMaterial(name: string, scene: Scene, tex: Texture, kind: RetroKind): ShaderMaterial {
  const defines: string[] = [];
  const attributes = ['position', 'normal', 'uv', 'color'];
  if (kind === 'atlas') {
    defines.push('#define ATLAS');
    attributes.push('uv2');
  }
  if (kind === 'nukage') defines.push('#define NUKAGE');
  if (kind === 'sprite' || kind === 'decal') defines.push('#define SPRITE', '#define ALPHATEST');
  const mat = new ShaderMaterial(
    name,
    scene,
    { vertex: 'retro', fragment: 'retro' },
    {
      attributes,
      uniforms: ['world', 'viewProjection', 'tileSize', 'lightPos', 'lightCol', 'eyePos', 'fogColor', 'fogRange', 'time', 'bands', 'emissiveBoost', 'tintColor'],
      samplers: ['tex'],
      defines,
    },
  );
  mat.setTexture('tex', tex);
  mat.setVector2('tileSize', new Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS));
  mat.setFloat('emissiveBoost', kind === 'nukage' ? 0.75 : 1.6);
  mat.setColor3('tintColor', Color3.White());
  mat.setFloat('bands', 0);
  mat.backFaceCulling = false;
  if (kind === 'decal') {
    mat.zOffset = -2;
  }
  mat.alphaMode = Constants.ALPHA_DISABLE;
  return mat;
}
