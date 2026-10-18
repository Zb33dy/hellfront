import { Mesh, RawTexture, Texture, VertexBuffer, VertexData, type Scene, type ShaderMaterial, Vector3 } from '@babylonjs/core';
import { Pix } from '../gfx/pixart';
import { createRetroMaterial } from '../gfx/retroMaterial';

// Persistent decals (blood, bullet holes, scorch marks) as one dynamic ring-buffer mesh.

export type DecalKind = 'blood' | 'bloodB' | 'hole' | 'scorch' | 'pool';
const TILE: Record<DecalKind, number> = { blood: 0, bloodB: 1, hole: 2, scorch: 3, pool: 4 };
const N_TILES = 5;
const TS = 32;

function buildAtlas(): Uint8Array {
  const tiles: Pix[] = [];
  for (let k = 0; k < 2; k++) {
    const p = new Pix(TS, TS, 100 + k);
    p.ell(16, 16, 6 + k * 2, 5 + k, [120, 6, 4], 0.1);
    for (let i = 0; i < 9; i++) {
      const a = p.rand() * Math.PI * 2, d = 6 + p.rand() * 8;
      p.ell(16 + Math.cos(a) * d, 16 + Math.sin(a) * d, 1 + p.rand() * 2.5, 1 + p.rand() * 2, [100 + p.rand() * 40, 4, 4], 0);
    }
    p.speckle(16, 16, 14, [80, 0, 0], 60, false);
    tiles.push(p);
  }
  const hole = new Pix(TS, TS, 103);
  hole.ell(16, 16, 3.2, 3.2, [26, 24, 22], 0);
  hole.ell(16, 16, 1.8, 1.8, [6, 6, 6], 0);
  hole.speckle(16, 16, 5, [60, 56, 50], 14, true);
  tiles.push(hole);
  const sc = new Pix(TS, TS, 104);
  for (let y = 0; y < TS; y++)
    for (let x = 0; x < TS; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5) / 15.5;
      if (d < 1 && sc.rand() < 1.15 - d) sc.set(x, y, [14, 12, 10]);
    }
  tiles.push(sc);
  const pool = new Pix(TS, TS, 105);
  pool.ell(16, 16, 14, 11, [90, 4, 4], 0.15);
  pool.ell(13, 13, 5, 3, [140, 20, 18], 0);
  tiles.push(pool);
  const W = TS * N_TILES;
  const data = new Uint8Array(W * TS * 4);
  tiles.forEach((t, k) => {
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++) {
        const s = (y * TS + x) * 4, d = (y * W + k * TS + x) * 4;
        for (let c = 0; c < 4; c++) data[d + c] = t.data[s + c];
      }
  });
  return data;
}

let atlas: Uint8Array | null = null;

export class Decals {
  readonly mesh: Mesh;
  readonly mat: ShaderMaterial;
  private pos: Float32Array;
  private uv: Float32Array;
  private col: Float32Array;
  private next = 0;
  private dirty = false;

  constructor(scene: Scene, private capacity = 320) {
    atlas ??= buildAtlas();
    const tex = RawTexture.CreateRGBATexture(atlas, TS * N_TILES, TS, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
    tex.wrapU = tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.mat = createRetroMaterial('decalMat', scene, tex, 'decal');
    this.pos = new Float32Array(capacity * 12);
    this.uv = new Float32Array(capacity * 8);
    this.col = new Float32Array(capacity * 16);
    const nrm = new Float32Array(capacity * 12);
    const idx = new Uint32Array(capacity * 6);
    for (let i = 0; i < capacity; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    this.mesh = new Mesh('decals', scene);
    const vd = new VertexData();
    vd.positions = this.pos;
    vd.uvs = this.uv;
    vd.colors = this.col;
    vd.normals = nrm;
    vd.indices = idx;
    vd.applyToMesh(this.mesh, true);
    this.mesh.material = this.mat;
    this.mesh.isPickable = false;
    this.mesh.alwaysSelectAsActiveMesh = true;
  }

  add(kind: DecalKind, p: Vector3, n: Vector3, size: number, light: [number, number, number]): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    // tangent basis
    const up = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const t = Vector3.Cross(up, n).normalize();
    const b = Vector3.Cross(n, t).normalize();
    const a = Math.random() * Math.PI * 2;
    const ca = Math.cos(a) * size * 0.5, sa = Math.sin(a) * size * 0.5;
    const tx = t.scale(ca).add(b.scale(sa));
    const bx = b.scale(ca).subtract(t.scale(sa));
    const o = p.add(n.scale(0.012 + (i % 7) * 0.0015));
    const c = [o.subtract(tx).subtract(bx), o.add(tx).subtract(bx), o.add(tx).add(bx), o.subtract(tx).add(bx)];
    c.forEach((v, k) => {
      this.pos[i * 12 + k * 3] = v.x;
      this.pos[i * 12 + k * 3 + 1] = v.y;
      this.pos[i * 12 + k * 3 + 2] = v.z;
    });
    const u0 = TILE[kind] / N_TILES, u1 = (TILE[kind] + 1) / N_TILES;
    this.uv.set([u0, 1, u1, 1, u1, 0, u0, 0], i * 8);
    for (let k = 0; k < 4; k++) this.col.set([light[0], light[1], light[2], 1], i * 16 + k * 4);
    this.dirty = true;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.pos, false, false);
    this.mesh.updateVerticesData(VertexBuffer.UVKind, this.uv, false, false);
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.col, false, false);
  }
}
