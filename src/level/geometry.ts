import { Mesh, VertexData, type Scene } from '@babylonjs/core';
import { tileOrigin, TILE_NAMES, type TileName } from '../gfx/textures';

export type V3 = [number, number, number];
export type UVFn = (x: number, y: number, z: number) => [number, number];

/** CPU-side mesh accumulator. Faces are subdivided so baked vertex lighting has resolution. */
export class GeoBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  uv2: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  /** Per-vertex light sample positions, nudged into the face so grid lookups land in the right cell. */
  samp: number[] = [];

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /**
   * Adds a planar face spanned from `o` by `du` and `dv`, split into cells of at most `maxSeg` units.
   * Winding is irrelevant (materials render double-sided); `n` is the lit normal.
   */
  face(o: V3, du: V3, dv: V3, n: V3, tile: TileName | number, uvf: UVFn, maxSeg = 1): void {
    const lu = Math.hypot(du[0], du[1], du[2]);
    const lv = Math.hypot(dv[0], dv[1], dv[2]);
    const su = Math.max(1, Math.ceil(lu / maxSeg - 1e-4));
    const sv = Math.max(1, Math.ceil(lv / maxSeg - 1e-4));
    const name = typeof tile === 'number' ? TILE_NAMES[tile] : tile;
    const [tu, tv] = tileOrigin(name);
    for (let j = 0; j < sv; j++)
      for (let i = 0; i < su; i++) {
        const base = this.vertexCount;
        const corners: [number, number][] = [
          [i / su, j / sv],
          [(i + 1) / su, j / sv],
          [(i + 1) / su, (j + 1) / sv],
          [i / su, (j + 1) / sv],
        ];
        for (const [a, b] of corners) {
          const x = o[0] + du[0] * a + dv[0] * b;
          const y = o[1] + du[1] * a + dv[1] * b;
          const z = o[2] + du[2] * a + dv[2] * b;
          this.pos.push(x, y, z);
          this.nrm.push(n[0], n[1], n[2]);
          const ia = a + ((i + 0.5) / su - a) * 0.1;
          const ib = b + ((j + 0.5) / sv - b) * 0.1;
          this.samp.push(
            o[0] + du[0] * ia + dv[0] * ib + n[0] * 0.06,
            o[1] + du[1] * ia + dv[1] * ib + n[1] * 0.06,
            o[2] + du[2] * ia + dv[2] * ib + n[2] * 0.06,
          );
          const [u, v] = uvf(x, y, z);
          this.uv.push(u, v); // tiled by fract() in the shader
          this.uv2.push(tu, tv);
          this.col.push(1, 1, 1, 1);
        }
        this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
  }

  /** Axis-aligned box; faces facing outward. `fit` maps one texture tile per face. */
  box(min: V3, max: V3, tile: TileName, topTile: TileName, opts: { fit?: boolean; bottom?: boolean; uvScale?: number } = {}): void {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    const s = opts.uvScale ?? 0.5;
    const fitU = (a: number, a0: number, a1: number) => (a - a0) / Math.max(a1 - a0, 1e-3);
    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
    const fit = opts.fit;
    // +z face
    this.face([x1, y1, z1], [-sx, 0, 0], [0, -sy, 0], [0, 0, 1], tile,
      fit ? (x, y) => [fitU(x1 - x + x0, x0, x1) * 0.9999, fitU(y1 - y + y0, y0, y1) * 0.9999] : (x, y) => [-x * s, -y * s]);
    // -z face
    this.face([x0, y1, z0], [sx, 0, 0], [0, -sy, 0], [0, 0, -1], tile,
      fit ? (x, y) => [fitU(x, x0, x1) * 0.9999, fitU(y1 - y + y0, y0, y1) * 0.9999] : (x, y) => [x * s, -y * s]);
    // +x face
    this.face([x1, y1, z0], [0, 0, sz], [0, -sy, 0], [1, 0, 0], tile,
      fit ? (_x, y, z) => [fitU(z, z0, z1) * 0.9999, fitU(y1 - y + y0, y0, y1) * 0.9999] : (_x, y, z) => [z * s, -y * s]);
    // -x face
    this.face([x0, y1, z1], [0, 0, -sz], [0, -sy, 0], [-1, 0, 0], tile,
      fit ? (_x, y, z) => [fitU(z1 - z + z0, z0, z1) * 0.9999, fitU(y1 - y + y0, y0, y1) * 0.9999] : (_x, y, z) => [-z * s, -y * s]);
    // top
    this.face([x0, y1, z0], [sx, 0, 0], [0, 0, sz], [0, 1, 0], topTile,
      fit ? (x, _y, z) => [fitU(x, x0, x1) * 0.9999, fitU(z, z0, z1) * 0.9999] : (x, _y, z) => [x * s, z * s]);
    if (opts.bottom)
      this.face([x0, y0, z0], [sx, 0, 0], [0, 0, sz], [0, -1, 0], topTile, (x, _y, z) => [x * s, z * s]);
  }

  /** Bake per-vertex light with a callback (position, normal) → rgb. */
  bake(f: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => [number, number, number]): void {
    for (let i = 0; i < this.vertexCount; i++) {
      const c = f(this.samp[i * 3], this.samp[i * 3 + 1], this.samp[i * 3 + 2], this.nrm[i * 3], this.nrm[i * 3 + 1], this.nrm[i * 3 + 2]);
      this.col[i * 4] = c[0];
      this.col[i * 4 + 1] = c[1];
      this.col[i * 4 + 2] = c[2];
    }
  }

  toMesh(name: string, scene: Scene, withUV2 = true): Mesh {
    const m = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = this.pos;
    vd.normals = this.nrm;
    vd.uvs = this.uv;
    if (withUV2) vd.uvs2 = this.uv2;
    vd.colors = this.col;
    vd.indices = this.idx;
    vd.applyToMesh(m, false);
    m.isPickable = false;
    m.alwaysSelectAsActiveMesh = true;
    m.freezeWorldMatrix();
    return m;
  }
}
