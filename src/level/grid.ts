import { CELL } from '../core/config';
import { TILE, type TileName } from '../gfx/textures';
import type { LevelData, Rect, ZoneDef } from './types';

export const enum CellKind {
  Solid = 0,
  Floor = 1,
  Nukage = 2,
  Door = 3,
  Lift = 4,
}

/** Rasterized level grid: one cell = CELL x CELL world units. */
export class Grid {
  readonly w: number;
  readonly h: number;
  readonly kind: Uint8Array;
  readonly floor: Float32Array;
  readonly ceil: Float32Array;
  readonly zone: Int16Array;
  readonly wallTex: Int16Array;
  readonly doorId: Int16Array;
  readonly liftId: Int16Array;
  readonly zones: ZoneDef[];

  constructor(readonly data: LevelData) {
    const { width: w, height: h } = data;
    this.w = w;
    this.h = h;
    const n = w * h;
    this.kind = new Uint8Array(n);
    this.floor = new Float32Array(n);
    this.ceil = new Float32Array(n);
    this.zone = new Int16Array(n).fill(-1);
    this.wallTex = new Int16Array(n).fill(-1);
    this.doorId = new Int16Array(n).fill(-1);
    this.liftId = new Int16Array(n).fill(-1);
    this.zones = data.zones;

    data.zones.forEach((z, zi) =>
      this.eachRect(z.rect, (i) => {
        this.kind[i] = z.nukage ? CellKind.Nukage : CellKind.Floor;
        this.floor[i] = z.floor;
        this.ceil[i] = z.ceil;
        this.zone[i] = zi;
      }),
    );
    for (const s of data.solids)
      this.eachRect(s.rect, (i) => {
        this.kind[i] = CellKind.Solid;
        this.wallTex[i] = TILE[s.tex];
      });
    for (const p of data.wallPaint)
      this.eachRect(p.rect, (i) => {
        if (this.kind[i] === CellKind.Solid) this.wallTex[i] = TILE[p.tex];
      });
    data.doors.forEach((d, di) => {
      // Door cells inherit floor and textures from their open neighbours.
      let floor = -Infinity;
      let ceil = Infinity;
      let zone = -1;
      this.eachRect(d.rect, (i) => {
        const cx = i % w, cy = Math.floor(i / w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = this.idx(cx + dx, cy + dy);
          if (j < 0) continue;
          const k = this.kind[j];
          if ((k === CellKind.Floor || k === CellKind.Nukage) && !this.inRect(d.rect, cx + dx, cy + dy)) {
            floor = Math.max(floor, this.floor[j]);
            ceil = Math.min(ceil, this.ceil[j]);
            if (zone < 0 || this.kind[j] === CellKind.Floor) zone = this.zone[j];
          }
        }
      });
      if (!isFinite(floor)) floor = 0;
      const doorCeil = Math.min(d.ceil ?? 3.2, isFinite(ceil) ? ceil : 3.2);
      this.eachRect(d.rect, (i) => {
        this.kind[i] = CellKind.Door;
        this.floor[i] = floor;
        this.ceil[i] = floor + Math.max(doorCeil - floor, 2.2);
        this.zone[i] = zone;
        this.doorId[i] = di;
      });
    });
    data.lifts.forEach((l, li) =>
      this.eachRect(l.rect, (i) => {
        this.kind[i] = CellKind.Lift;
        this.floor[i] = l.low;
        this.liftId[i] = li;
        if (this.zone[i] < 0) this.zone[i] = 0;
        if (this.ceil[i] <= l.high + 2) this.ceil[i] = l.high + 4;
      }),
    );
  }

  idx(cx: number, cy: number): number {
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return -1;
    return cy * this.w + cx;
  }

  cellAt(x: number, z: number): number {
    return this.idx(Math.floor(x / CELL), Math.floor(z / CELL));
  }

  isSolid(i: number): boolean {
    return i < 0 || this.kind[i] === CellKind.Solid;
  }

  zoneOf(i: number): ZoneDef | null {
    const z = i >= 0 ? this.zone[i] : -1;
    return z >= 0 ? this.zones[z] : null;
  }

  wallTileFor(solidIdx: number, openIdx: number): number {
    if (solidIdx >= 0 && this.wallTex[solidIdx] >= 0) return this.wallTex[solidIdx];
    const z = this.zoneOf(openIdx);
    return TILE[(z?.wallTex ?? this.data.defaultWall) as TileName];
  }

  inRect(r: Rect, cx: number, cy: number): boolean {
    return cx >= r[0] && cy >= r[1] && cx < r[0] + r[2] && cy < r[1] + r[3];
  }

  eachRect(r: Rect, f: (i: number) => void): void {
    for (let y = r[1]; y < r[1] + r[3]; y++)
      for (let x = r[0]; x < r[0] + r[2]; x++) {
        const i = this.idx(x, y);
        if (i >= 0) f(i);
      }
  }

  /** 2D grid line of sight (ignores heights and doors). */
  los2D(x0: number, z0: number, x1: number, z1: number): boolean {
    let cx = Math.floor(x0 / CELL), cz = Math.floor(z0 / CELL);
    const ex = Math.floor(x1 / CELL), ez = Math.floor(z1 / CELL);
    const dx = x1 - x0, dz = z1 - z0;
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(CELL / dx) : Infinity;
    const tdz = dz !== 0 ? Math.abs(CELL / dz) : Infinity;
    let tmx = dx !== 0 ? ((dx > 0 ? (cx + 1) * CELL - x0 : x0 - cx * CELL) / Math.abs(dx)) : Infinity;
    let tmz = dz !== 0 ? ((dz > 0 ? (cz + 1) * CELL - z0 : z0 - cz * CELL) / Math.abs(dz)) : Infinity;
    for (let k = 0; k < 256; k++) {
      if (cx === ex && cz === ez) return true;
      if (tmx < tmz) {
        if (tmx > 1) return true;
        tmx += tdx;
        cx += stepX;
      } else {
        if (tmz > 1) return true;
        tmz += tdz;
        cz += stepZ;
      }
      if (this.isSolid(this.idx(cx, cz))) return false;
    }
    return true;
  }
}
