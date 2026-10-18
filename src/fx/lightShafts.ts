import { Constants, Effect, Mesh, ShaderMaterial, VertexData, type Scene } from '@babylonjs/core';
import { CELL } from '../core/config';
import type { Grid } from '../level/grid';
import type { LevelData } from '../level/types';

// Fake volumetric shafts: crossed additive quads under ceiling lights, with soft edges and slow dust shimmer.

Effect.ShadersStore['shaftVertexShader'] = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec4 color;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec2 vUV;
varying vec4 vColor;
varying vec3 vPos;
void main(void) {
  vec4 wp = world * vec4(position, 1.0);
  vPos = wp.xyz;
  vUV = uv;
  vColor = color;
  gl_Position = viewProjection * wp;
}`;

Effect.ShadersStore['shaftFragmentShader'] = `
precision highp float;
varying vec2 vUV;
varying vec4 vColor;
varying vec3 vPos;
uniform float time;
uniform vec3 eyePos;
uniform float strength;
void main(void) {
  float edge = sin(vUV.x * 3.14159);
  edge = edge * edge;
  float fall = pow(1.0 - vUV.y, 1.4);
  float dust = 0.82 + 0.18 * sin(vPos.y * 3.0 + time * 0.7 + vPos.x * 1.3) * sin(vPos.z * 2.1 - time * 0.5);
  float near = clamp(length(vPos - eyePos) / 4.0, 0.0, 1.0);
  gl_FragColor = vec4(vColor.rgb * edge * fall * dust * near * strength, 1.0);
}`;

export function buildLightShafts(data: LevelData, grid: Grid, scene: Scene): Mesh | null {
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (const l of data.lights) {
    if (!l.shaft) continue;
    const ci = grid.idx(Math.floor(l.x), Math.floor(l.y));
    if (ci < 0) continue;
    const top = grid.ceil[ci] - 0.15;
    const bottom = grid.floor[ci];
    const cx = l.x * CELL, cz = l.y * CELL;
    const rt = 0.8, rb = 2.6;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI + 0.3;
      const dx = Math.cos(a), dz = Math.sin(a);
      const base = pos.length / 3;
      pos.push(cx - dx * rt, top, cz - dz * rt, cx + dx * rt, top, cz + dz * rt, cx + dx * rb, bottom, cz + dz * rb, cx - dx * rb, bottom, cz - dz * rb);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let v = 0; v < 4; v++) col.push(l.color[0], l.color[1], l.color[2], 1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  if (!idx.length) return null;
  const m = new Mesh('shafts', scene);
  const vd = new VertexData();
  vd.positions = pos;
  vd.uvs = uv;
  vd.colors = col;
  vd.indices = idx;
  vd.applyToMesh(m);
  const mat = new ShaderMaterial('shaftMat', scene, { vertex: 'shaft', fragment: 'shaft' }, {
    attributes: ['position', 'uv', 'color'],
    uniforms: ['world', 'viewProjection', 'time', 'eyePos', 'strength'],
    needAlphaBlending: true,
  });
  mat.backFaceCulling = false;
  mat.alphaMode = Constants.ALPHA_ADD;
  mat.disableDepthWrite = true;
  mat.setFloat('strength', 0.11);
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    t += scene.getEngine().getDeltaTime() / 1000;
    mat.setFloat('time', t);
    if (scene.activeCamera) mat.setVector3('eyePos', scene.activeCamera.globalPosition);
  });
  m.material = mat;
  m.isPickable = false;
  m.alphaIndex = 10;
  return m;
}
