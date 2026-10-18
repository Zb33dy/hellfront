import { Color3, Mesh, type Scene, type ShaderMaterial, Vector3 } from '@babylonjs/core';
import { CELL } from '../core/config';
import { getAtlasTexture, getNukageTexture, TILE_NAMES, type TileName } from '../gfx/textures';
import { createRetroMaterial } from '../gfx/retroMaterial';
import type { LightManager } from '../gfx/lightManager';
import { CellKind, Grid } from './grid';
import { GeoBuilder, type V3 } from './geometry';
import type { BoxDef, LevelData, LightDef } from './types';
import { buildLightShafts } from '../fx/lightShafts';

export interface BoxCollider {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
}

export interface BuiltLevel {
  grid: Grid;
  atlasMat: ShaderMaterial;
  nukageMat: ShaderMaterial;
  meshes: Mesh[];
  boxes: BoxCollider[];
  lightGrid: Float32Array;
  bakeLight: (x: number, y: number, z: number) => [number, number, number];
}

const FIT_TILES = new Set<TileName>(['crate', 'computer', 'lightPanel']);
/** Share of an animated light baked into vertex colours: its minimum, so the dynamic part never goes negative. */
const bakedShare = (mode: LightDef['mode']): number => (mode === 'pulse' ? 0.24 : mode === 'alarm' ? 0.12 : mode === 'flicker' ? 0.05 : 1);

interface WLight { x: number; y: number; z: number; r: number; g: number; b: number; range: number }

export function boxBounds(b: BoxDef): BoxCollider {
  const [x, y, w, h] = b.rect;
  return { minX: x * CELL, maxX: (x + w) * CELL, minZ: y * CELL, maxZ: (y + h) * CELL, minY: b.y0 ?? 0, maxY: b.y1 };
}

export function buildLevel(data: LevelData, scene: Scene, lights: LightManager, opts: { shafts?: boolean } = {}): BuiltLevel {
  const grid = new Grid(data);
  const C = CELL;
  const atlas = getAtlasTexture(scene);
  const atlasMat = createRetroMaterial('levelMat', scene, atlas, 'atlas');
  const nukageMat = createRetroMaterial('nukageMat', scene, getNukageTexture(scene), 'nukage');
  lights.register(atlasMat);
  lights.register(nukageMat);

  const geo = new GeoBuilder();
  const nuk = new GeoBuilder();

  const tileOf = (i: number): TileName => TILE_NAMES[i];

  for (let cy = 0; cy < grid.h; cy++)
    for (let cx = 0; cx < grid.w; cx++) {
      const i = grid.idx(cx, cy);
      const k = grid.kind[i];
      if (k === CellKind.Solid) continue;
      const zone = grid.zoneOf(i);
      if (!zone) continue;
      const f = grid.floor[i];
      const c = grid.ceil[i];
      const x0 = cx * C, z0 = cy * C, x1 = x0 + C, z1 = z0 + C;

      if (k === CellKind.Nukage) {
        nuk.face([x0, f, z0], [C, 0, 0], [0, 0, C], [0, 1, 0], 'nukage', (x, _y, z) => [x / (C * 2), z / (C * 2)]);
      } else if (k !== CellKind.Lift) {
        geo.face([x0, f, z0], [C, 0, 0], [0, 0, C], [0, 1, 0], zone.floorTex, (x, _y, z) => [x / C, z / C]);
      }
      geo.face([x0, c, z0], [C, 0, 0], [0, 0, C], [0, -1, 0], zone.ceilTex, (x, _y, z) => [x / C, z / C]);

      const sides: { dx: number; dy: number; o: (bottom: number, top: number) => [V3, V3, V3]; n: V3; u: (x: number, z: number) => number }[] = [
        { dx: 1, dy: 0, o: (b, t) => [[x1, t, z0], [0, 0, C], [0, b - t, 0]], n: [-1, 0, 0], u: (_x, z) => -z / C },
        { dx: -1, dy: 0, o: (b, t) => [[x0, t, z1], [0, 0, -C], [0, b - t, 0]], n: [1, 0, 0], u: (_x, z) => z / C },
        { dx: 0, dy: 1, o: (b, t) => [[x0, t, z1], [C, 0, 0], [0, b - t, 0]], n: [0, 0, -1], u: (x) => x / C },
        { dx: 0, dy: -1, o: (b, t) => [[x1, t, z0], [-C, 0, 0], [0, b - t, 0]], n: [0, 0, 1], u: (x) => -x / C },
      ];
      for (const s of sides) {
        const j = grid.idx(cx + s.dx, cy + s.dy);
        const uvf = (x: number, y: number, z: number): [number, number] => [s.u(x, z), -y / C];
        if (grid.isSolid(j)) {
          const [o, du, dv] = s.o(f, c);
          geo.face(o, du, dv, s.n, tileOf(grid.wallTileFor(j, i)), uvf);
          continue;
        }
        const nz = grid.zoneOf(j);
        const fn = grid.floor[j];
        const cn = grid.ceil[j];
        if (fn > f + 1e-3) {
          const top = Math.min(fn, c);
          const [o, du, dv] = s.o(f, top);
          const tex = (nz?.stepTex ?? nz?.wallTex ?? data.defaultWall) as TileName;
          geo.face(o, du, dv, s.n, tex, uvf);
        }
        if (cn < c - 1e-3) {
          const bottom = Math.max(cn, f);
          const [o, du, dv] = s.o(bottom, c);
          const tex = (nz?.wallTex ?? zone.wallTex) as TileName;
          geo.face(o, du, dv, s.n, tex, uvf);
        }
      }
    }

  // Static boxes (cargo, ships, consoles)
  const boxes: BoxCollider[] = [];
  for (const b of data.boxes) {
    const bb = boxBounds(b);
    boxes.push(bb);
    geo.box([bb.minX, bb.minY, bb.minZ], [bb.maxX, bb.maxY, bb.maxZ], b.tex, b.topTex ?? b.tex, {
      fit: FIT_TILES.has(b.tex),
      bottom: bb.minY > 0.05,
    });
  }

  // Ceiling light fixtures
  for (const l of data.lights) {
    if (!l.fixture) continue;
    const ci = grid.idx(Math.floor(l.x), Math.floor(l.y));
    if (ci < 0) continue;
    const top = grid.ceil[ci];
    const s = l.shaft ? 0.9 : 0.5;
    geo.box([l.x * C - s, top - 0.14, l.y * C - s], [l.x * C + s, top, l.y * C + s], 'lightPanel', 'lightPanel', { fit: true, bottom: true });
  }

  // ---- Light baking ----
  const wl: WLight[] = data.lights.map((l: LightDef) => {
    const k = bakedShare(l.mode) * l.intensity;
    return { x: l.x * C, y: l.h, z: l.y * C, r: l.color[0] * k, g: l.color[1] * k, b: l.color[2] * k, range: l.range };
  });
  // Per-cell candidate lists
  const cellLights: number[][] = Array.from({ length: grid.w * grid.h }, () => []);
  wl.forEach((l, li) => {
    const r = Math.ceil(l.range / C) + 1;
    const lcx = Math.floor(l.x / C), lcz = Math.floor(l.z / C);
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        const j = grid.idx(lcx + dx, lcz + dz);
        if (j >= 0) cellLights[j].push(li);
      }
  });

  const occluders = boxes.filter((b) => b.minY < 0.4 && b.maxY > 1);
  const bakeLight = (x: number, y: number, z: number, nx = 0, ny = 0, nz = 0, sprite = false): [number, number, number] => {
    const ci = grid.cellAt(x, z);
    const zone = grid.zoneOf(ci);
    const amb = zone?.ambient ?? [0.05, 0.05, 0.05];
    let r = amb[0], g = amb[1], b = amb[2];
    if (ci < 0) return [r, g, b];
    for (const li of cellLights[ci]) {
      const l = wl[li];
      const dx = l.x - x, dy = l.y - y, dz = l.z - z;
      const d = Math.hypot(dx, dy, dz);
      if (d >= l.range) continue;
      let ndl = 1;
      if (!sprite) ndl = Math.max((nx * dx + ny * dy + nz * dz) / Math.max(d, 1e-3), 0) * 0.8 + 0.2;
      if (ndl <= 0) continue;
      if (!grid.los2D(l.x, l.z, x, z)) continue;
      const a = 1 - d / l.range;
      const att = a * a * ndl;
      r += l.r * att;
      g += l.g * att;
      b += l.b * att;
    }
    // Cheap ambient occlusion: darker near the floor and under cargo.
    let ao = 1;
    if (!sprite) {
      const f = grid.floor[ci];
      if (ny > 0.5) {
        for (const o of occluders) {
          const ex = Math.max(o.minX - x, 0, x - o.maxX);
          const ez = Math.max(o.minZ - z, 0, z - o.maxZ);
          const e = Math.hypot(ex, ez);
          if (e < 1.2 && y < o.maxY) ao = Math.min(ao, 0.35 + 0.65 * (e / 1.2));
        }
      } else if (Math.abs(ny) < 0.5) {
        const hgt = y - f;
        ao = 0.62 + 0.38 * Math.min(Math.max(hgt / 1.4, 0), 1);
      }
    }
    return [r * ao, g * ao, b * ao];
  };

  geo.bake((x, y, z, nx, ny, nz) => bakeLight(x, y, z, nx, ny, nz));
  nuk.bake((x, y, z, nx, ny, nz) => {
    const c = bakeLight(x, y, z, nx, ny, nz);
    return [c[0] * 0.8 + 0.05, c[1] * 0.8 + 0.12, c[2] * 0.8 + 0.04];
  });

  const lightGrid = new Float32Array(grid.w * grid.h * 3);
  for (let cy = 0; cy < grid.h; cy++)
    for (let cx = 0; cx < grid.w; cx++) {
      const i = grid.idx(cx, cy);
      if (grid.isSolid(i)) continue;
      const c = bakeLight((cx + 0.5) * C, grid.floor[i] + 1.2, (cy + 0.5) * C, 0, 0, 0, true);
      lightGrid[i * 3] = c[0];
      lightGrid[i * 3 + 1] = c[1];
      lightGrid[i * 3 + 2] = c[2];
    }

  const meshes: Mesh[] = [];
  const levelMesh = geo.toMesh('level', scene);
  levelMesh.material = atlasMat;
  meshes.push(levelMesh);
  if (nuk.vertexCount > 0) {
    const nm = nuk.toMesh('nukage', scene, false);
    nm.material = nukageMat;
    meshes.push(nm);
  }

  // Dynamic (animated) lights
  for (const l of data.lights) {
    if (!l.mode || l.mode === 'static') continue;
    lights.addWorld(new Vector3(l.x * C, l.h, l.y * C), new Color3(...l.color), l.intensity, l.range, l.mode, bakedShare(l.mode));
  }

  if (opts.shafts !== false) {
    const sm = buildLightShafts(data, grid, scene);
    if (sm) meshes.push(sm);
  }

  return { grid, atlasMat, nukageMat, meshes, boxes, lightGrid, bakeLight: (x, y, z) => bakeLight(x, y, z, 0, 0, 0, true) };
}

/** Bilinear sample of the baked sprite light grid. */
export function sampleLightGrid(grid: Grid, lg: Float32Array, x: number, z: number, out: [number, number, number]): [number, number, number] {
  const fx = x / CELL - 0.5, fz = z / CELL - 0.5;
  const x0 = Math.floor(fx), z0 = Math.floor(fz);
  const tx = fx - x0, tz = fz - z0;
  out[0] = out[1] = out[2] = 0;
  let wsum = 0;
  for (let dz = 0; dz <= 1; dz++)
    for (let dx = 0; dx <= 1; dx++) {
      const i = grid.idx(x0 + dx, z0 + dz);
      if (i < 0 || grid.isSolid(i)) continue;
      const w = (dx ? tx : 1 - tx) * (dz ? tz : 1 - tz) + 1e-4;
      out[0] += lg[i * 3] * w;
      out[1] += lg[i * 3 + 1] * w;
      out[2] += lg[i * 3 + 2] * w;
      wsum += w;
    }
  if (wsum > 0) {
    out[0] /= wsum;
    out[1] /= wsum;
    out[2] /= wsum;
  }
  return out;
}
