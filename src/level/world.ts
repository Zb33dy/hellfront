import { Vector3 } from '@babylonjs/core';
import { CELL } from '../core/config';
import { CellKind, type Grid } from './grid';
import type { BoxCollider } from './levelBuilder';
import type { Door, Lift } from './doors';

export interface Collider extends BoxCollider {
  /** Optional owner, e.g. a barrel. */
  owner?: unknown;
  solidForShots?: boolean;
}

export type HitKind = 'none' | 'wall' | 'floor' | 'ceil' | 'box' | 'door' | 'entity';

export interface RayHit {
  t: number;
  point: Vector3;
  normal: Vector3;
  kind: HitKind;
  cell: number;
  collider?: Collider;
  entity?: unknown;
}

export interface Mover {
  pos: Vector3; // feet position
  radius: number;
  height: number;
}

/** Collision + ray queries against the grid, doors, lifts and box colliders. */
export class World {
  private cellColliders: Collider[][];
  private visitMark = 0;
  private marks = new WeakMap<Collider, number>();

  constructor(
    readonly grid: Grid,
    readonly doors: Door[],
    readonly lifts: Lift[],
    staticBoxes: Collider[],
  ) {
    this.cellColliders = Array.from({ length: grid.w * grid.h }, () => []);
    staticBoxes.forEach((b) => this.addCollider(b));
  }

  addCollider(c: Collider): void {
    this.forCellsOf(c, (i) => this.cellColliders[i].push(c));
  }

  removeCollider(c: Collider): void {
    this.forCellsOf(c, (i) => {
      const a = this.cellColliders[i];
      const k = a.indexOf(c);
      if (k >= 0) a.splice(k, 1);
    });
  }

  private forCellsOf(c: Collider, f: (i: number) => void): void {
    const x0 = Math.floor(c.minX / CELL), x1 = Math.floor((c.maxX - 1e-4) / CELL);
    const z0 = Math.floor(c.minZ / CELL), z1 = Math.floor((c.maxZ - 1e-4) / CELL);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const i = this.grid.idx(x, z);
        if (i >= 0) f(i);
      }
  }

  doorAt(i: number): Door | null {
    const d = i >= 0 ? this.grid.doorId[i] : -1;
    return d >= 0 ? this.doors[d] : null;
  }

  liftAt(i: number): Lift | null {
    const l = i >= 0 ? this.grid.liftId[i] : -1;
    return l >= 0 ? this.lifts[l] : null;
  }

  /** Is the grid cell itself impassable for a body with feet at `feet`? */
  cellBlocks(i: number, feet: number, head: number, step: number): boolean {
    const g = this.grid;
    if (i < 0 || g.kind[i] === CellKind.Solid) return true;
    if (g.floor[i] > feet + step) return true;
    if (g.ceil[i] < head - 0.02) return true;
    return false;
  }

  private gatherColliders(minX: number, maxX: number, minZ: number, maxZ: number, out: Collider[]): void {
    this.visitMark++;
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const z0 = Math.floor(minZ / CELL), z1 = Math.floor(maxZ / CELL);
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const i = this.grid.idx(x, z);
        if (i < 0) continue;
        for (const c of this.cellColliders[i]) {
          if (this.marks.get(c) === this.visitMark) continue;
          this.marks.set(c, this.visitMark);
          out.push(c);
        }
        const d = this.doorAt(i);
        if (d) {
          const dc = d.collider();
          if (dc && this.marks.get(dc) !== this.visitMark) {
            this.marks.set(dc, this.visitMark);
            out.push(dc);
          }
        }
      }
  }

  private tmp: Collider[] = [];

  /**
   * Moves a circle-footprint body horizontally with wall sliding.
   * Returns true if anything was hit.
   */
  move(m: Mover, dx: number, dz: number, step: number): boolean {
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.ceil(len / (m.radius * 0.5)));
    let hit = false;
    for (let s = 0; s < n; s++) {
      m.pos.x += dx / n;
      m.pos.z += dz / n;
      if (this.resolve(m, step)) hit = true;
    }
    return hit;
  }

  /** Pushes the body out of every overlapping blocker. */
  resolve(m: Mover, step: number): boolean {
    const r = m.radius;
    const feet = m.pos.y, head = m.pos.y + m.height;
    let hit = false;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      const p = m.pos;
      // grid cells
      const x0 = Math.floor((p.x - r) / CELL), x1 = Math.floor((p.x + r) / CELL);
      const z0 = Math.floor((p.z - r) / CELL), z1 = Math.floor((p.z + r) / CELL);
      for (let cz = z0; cz <= z1; cz++)
        for (let cx = x0; cx <= x1; cx++) {
          const i = this.grid.idx(cx, cz);
          if (!this.cellBlocks(i, feet, head, step)) continue;
          if (this.pushOut(p, r, cx * CELL, cx * CELL + CELL, cz * CELL, cz * CELL + CELL)) moved = hit = true;
        }
      // boxes and doors
      this.tmp.length = 0;
      this.gatherColliders(p.x - r, p.x + r, p.z - r, p.z + r, this.tmp);
      for (const c of this.tmp) {
        if (c.maxY <= feet + step || c.minY >= head) continue;
        if (this.pushOut(p, r, c.minX, c.maxX, c.minZ, c.maxZ)) moved = hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }

  private pushOut(p: Vector3, r: number, minX: number, maxX: number, minZ: number, maxZ: number): boolean {
    const qx = Math.min(Math.max(p.x, minX), maxX);
    const qz = Math.min(Math.max(p.z, minZ), maxZ);
    let dx = p.x - qx, dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return false;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      const k = (r - d) / d + 1e-5;
      p.x += dx * k;
      p.z += dz * k;
    } else {
      // centre inside the box: push out along the shallowest axis
      const l = p.x - minX, rr = maxX - p.x, t = p.z - minZ, b = maxZ - p.z;
      const mn = Math.min(l, rr, t, b);
      if (mn === l) p.x = minX - r;
      else if (mn === rr) p.x = maxX + r;
      else if (mn === t) p.z = minZ - r;
      else p.z = maxZ + r;
      dx = dz = 0;
    }
    return true;
  }

  /** Highest walkable surface under the footprint (cells + box tops within step reach). */
  groundAt(x: number, z: number, r: number, feet: number, step: number): number {
    let g = -Infinity;
    const rr = r * 0.7;
    const x0 = Math.floor((x - rr) / CELL), x1 = Math.floor((x + rr) / CELL);
    const z0 = Math.floor((z - rr) / CELL), z1 = Math.floor((z + rr) / CELL);
    for (let cz = z0; cz <= z1; cz++)
      for (let cx = x0; cx <= x1; cx++) {
        const i = this.grid.idx(cx, cz);
        if (i < 0 || this.grid.kind[i] === CellKind.Solid) continue;
        const f = this.grid.floor[i];
        if (f <= feet + step) g = Math.max(g, f);
      }
    this.tmp.length = 0;
    this.gatherColliders(x - rr, x + rr, z - rr, z + rr, this.tmp);
    for (const c of this.tmp) {
      if (c.maxY > feet + step) continue;
      if (x + rr < c.minX || x - rr > c.maxX || z + rr < c.minZ || z - rr > c.maxZ) continue;
      g = Math.max(g, c.maxY);
    }
    if (g === -Infinity) {
      const i = this.grid.cellAt(x, z);
      g = i >= 0 ? this.grid.floor[i] : 0;
    }
    return g;
  }

  ceilAt(x: number, z: number, r: number): number {
    let c = Infinity;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let cz = z0; cz <= z1; cz++)
      for (let cx = x0; cx <= x1; cx++) {
        const i = this.grid.idx(cx, cz);
        if (i < 0 || this.grid.kind[i] === CellKind.Solid) continue;
        c = Math.min(c, this.grid.ceil[i]);
      }
    return c;
  }

  isNukage(x: number, z: number): boolean {
    const i = this.grid.cellAt(x, z);
    return i >= 0 && this.grid.kind[i] === CellKind.Nukage;
  }

  /** Grid-DDA ray cast against cells, floors, ceilings, doors and boxes. Entities are tested via callback. */
  raycast(
    o: Vector3,
    d: Vector3,
    maxDist: number,
    entityTest?: (o: Vector3, d: Vector3, maxT: number) => { t: number; entity: unknown; normal?: Vector3 } | null,
  ): RayHit {
    const g = this.grid;
    let cx = Math.floor(o.x / CELL), cz = Math.floor(o.z / CELL);
    const stepX = d.x > 0 ? 1 : -1, stepZ = d.z > 0 ? 1 : -1;
    const tdx = Math.abs(d.x) > 1e-9 ? CELL / Math.abs(d.x) : Infinity;
    const tdz = Math.abs(d.z) > 1e-9 ? CELL / Math.abs(d.z) : Infinity;
    let tmx = Math.abs(d.x) > 1e-9 ? (d.x > 0 ? (cx + 1) * CELL - o.x : o.x - cx * CELL) / Math.abs(d.x) : Infinity;
    let tmz = Math.abs(d.z) > 1e-9 ? (d.z > 0 ? (cz + 1) * CELL - o.z : o.z - cz * CELL) / Math.abs(d.z) : Infinity;
    let tEnter = 0;
    let nx = 0, nz = 0;
    let best: RayHit = { t: maxDist, point: new Vector3(), normal: new Vector3(0, 1, 0), kind: 'none', cell: -1 };
    const cols: Collider[] = [];
    this.visitMark++;
    for (let k = 0; k < 512; k++) {
      const i = g.idx(cx, cz);
      const tExit = Math.min(tmx, tmz);
      if (i < 0 || g.kind[i] === CellKind.Solid) {
        best = { t: tEnter, point: new Vector3(), normal: new Vector3(nx, 0, nz), kind: 'wall', cell: i };
        break;
      }
      // colliders in this cell
      for (const c of this.cellColliders[i]) {
        if (this.marks.get(c) === this.visitMark) continue;
        this.marks.set(c, this.visitMark);
        cols.push(c);
      }
      const door = this.doorAt(i);
      if (door) {
        const dc = door.collider();
        if (dc && this.marks.get(dc) !== this.visitMark) {
          this.marks.set(dc, this.visitMark);
          cols.push(dc);
        }
      }
      const f = g.floor[i], c = g.ceil[i];
      const yEnter = o.y + d.y * tEnter;
      if (tEnter > 0 && (yEnter < f || yEnter > c)) {
        best = { t: tEnter, point: new Vector3(), normal: new Vector3(nx, 0, nz), kind: 'wall', cell: i };
        break;
      }
      let done = false;
      if (d.y < 0) {
        const tf = (f - o.y) / d.y;
        if (tf >= tEnter && tf <= tExit) {
          best = { t: tf, point: new Vector3(), normal: new Vector3(0, 1, 0), kind: 'floor', cell: i };
          done = true;
        }
      } else if (d.y > 0) {
        const tc = (c - o.y) / d.y;
        if (tc >= tEnter && tc <= tExit) {
          best = { t: tc, point: new Vector3(), normal: new Vector3(0, -1, 0), kind: 'ceil', cell: i };
          done = true;
        }
      }
      if (done || tExit > maxDist) break;
      if (tmx < tmz) {
        tEnter = tmx;
        tmx += tdx;
        cx += stepX;
        nx = -stepX;
        nz = 0;
      } else {
        tEnter = tmz;
        tmz += tdz;
        cz += stepZ;
        nx = 0;
        nz = -stepZ;
      }
    }
    if (best.t > maxDist) best = { t: maxDist, point: new Vector3(), normal: new Vector3(0, 1, 0), kind: 'none', cell: -1 };
    for (const c of cols) {
      const r = rayBox(o, d, c);
      if (r && r.t < best.t) {
        const isDoor = this.doors.some((dd) => dd.slab === c);
        best = { t: r.t, point: new Vector3(), normal: r.n, kind: isDoor ? 'door' : 'box', cell: g.cellAt(o.x + d.x * r.t, o.z + d.z * r.t), collider: c };
      }
    }
    if (entityTest) {
      const e = entityTest(o, d, best.t);
      if (e && e.t < best.t) best = { t: e.t, point: new Vector3(), normal: e.normal ?? d.scale(-1), kind: 'entity', cell: -1, entity: e.entity };
    }
    best.point.set(o.x + d.x * best.t, o.y + d.y * best.t, o.z + d.z * best.t);
    return best;
  }

  /** Line of sight between two points (eye-level), ignoring entities. */
  los(a: Vector3, b: Vector3): boolean {
    const d = b.subtract(a);
    const len = d.length();
    if (len < 1e-3) return true;
    d.scaleInPlace(1 / len);
    const h = this.raycast(a, d, len);
    return h.kind === 'none' || h.t >= len - 0.05;
  }
}

function rayBox(o: Vector3, d: Vector3, b: BoxCollider): { t: number; n: Vector3 } | null {
  let tmin = -Infinity, tmax = Infinity;
  let n = new Vector3();
  const axes: [number, number, number, number, Vector3][] = [
    [o.x, d.x, b.minX, b.maxX, new Vector3(-1, 0, 0)],
    [o.y, d.y, b.minY, b.maxY, new Vector3(0, -1, 0)],
    [o.z, d.z, b.minZ, b.maxZ, new Vector3(0, 0, -1)],
  ];
  for (const [oo, dd, mn, mx, an] of axes) {
    if (Math.abs(dd) < 1e-9) {
      if (oo < mn || oo > mx) return null;
      continue;
    }
    let t1 = (mn - oo) / dd, t2 = (mx - oo) / dd;
    let sign = 1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      sign = -1;
    }
    if (t1 > tmin) {
      tmin = t1;
      n = an.scale(sign);
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  if (tmin < 0) return null; // origin inside the box
  return { t: tmin, n };
}
