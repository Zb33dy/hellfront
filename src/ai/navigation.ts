import { CELL } from '../core/config';
import { CellKind, type Grid } from '../level/grid';
import type { World } from '../level/world';

const INF = 1e9;
const NB: [number, number, number][] = [
  [1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
  [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14],
];

/**
 * Dijkstra flow field rooted at the player's cell. Every enemy follows the gradient downhill,
 * so one field serves all monsters. Recomputed when the player changes cell or doors move.
 */
export class NavField {
  readonly dist: Float32Array;
  private grid: Grid;
  private src = -1;
  private timer = 0;
  private heap: number[] = [];

  constructor(private world: World) {
    this.grid = world.grid;
    this.dist = new Float32Array(this.grid.w * this.grid.h).fill(INF);
  }

  /** Can a monster stand in / walk through cell i? */
  cellOpen(i: number): boolean {
    const g = this.grid;
    if (i < 0 || g.kind[i] === CellKind.Solid) return false;
    if (g.kind[i] === CellKind.Door) {
      const d = this.world.doorAt(i)!;
      if (d.open > 0.9) return true;
      return d.def.type === 'normal' && !d.locked;
    }
    return g.ceil[i] - g.floor[i] >= 1.9;
  }

  /** Movement from cell a into neighbouring cell b. */
  edge(a: number, b: number): boolean {
    if (!this.cellOpen(a) || !this.cellOpen(b)) return false;
    const g = this.grid;
    const up = g.floor[b] - g.floor[a];
    return up <= 0.62 && up >= -1.1;
  }

  update(dt: number, px: number, pz: number, force = false): void {
    this.timer -= dt;
    const s = this.grid.cellAt(px, pz);
    if (!force && s === this.src && this.timer > 0) return;
    this.src = s;
    this.timer = 0.6;
    this.compute(s);
  }

  private compute(src: number): void {
    const g = this.grid;
    this.dist.fill(INF);
    if (src < 0) return;
    const heap = this.heap;
    heap.length = 0;
    this.dist[src] = 0;
    this.push(src);
    while (heap.length) {
      const enc = heap[0];
      const c = this.pop();
      const cd = this.dist[c];
      if (Math.floor(enc / 8192) > cd) continue; // stale
      const cx = c % g.w, cy = (c / g.w) | 0;
      for (const [dx, dy, cost] of NB) {
        const n = g.idx(cx + dx, cy + dy);
        if (n < 0) continue;
        if (!this.edge(n, c)) continue;
        if (dx !== 0 && dy !== 0) {
          // no corner cutting
          if (!this.edge(n, g.idx(cx + dx, cy)) && !this.edge(n, g.idx(cx, cy + dy))) continue;
          if (!this.cellOpen(g.idx(cx + dx, cy)) || !this.cellOpen(g.idx(cx, cy + dy))) continue;
        }
        const nukage = g.kind[n] === CellKind.Nukage ? 6 : 0;
        const nd = cd + cost + nukage;
        if (nd < this.dist[n]) {
          this.dist[n] = nd;
          this.push(n);
        }
      }
    }
  }

  // Heap entries encode (distance, cell) as one number so stale entries keep a valid order.
  private push(i: number): void {
    const h = this.heap;
    h.push(this.dist[i] * 8192 + i);
    let k = h.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (h[p] <= h[k]) break;
      [h[p], h[k]] = [h[k], h[p]];
      k = p;
    }
  }

  private pop(): number {
    const h = this.heap;
    const top = h[0];
    const last = h.pop()!;
    if (h.length) {
      h[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1, r = l + 1;
        let m = k;
        if (l < h.length && h[l] < h[m]) m = l;
        if (r < h.length && h[r] < h[m]) m = r;
        if (m === k) break;
        [h[m], h[k]] = [h[k], h[m]];
        k = m;
      }
    }
    return top % 8192;
  }

  /** Next waypoint (world xz of a neighbouring cell centre) toward the player, or null. */
  next(x: number, z: number): [number, number] | null {
    const g = this.grid;
    const c = g.cellAt(x, z);
    if (c < 0 || this.dist[c] >= INF) return null;
    const cx = c % g.w, cy = (c / g.w) | 0;
    let best = c, bd = this.dist[c];
    for (const [dx, dy] of NB) {
      const n = g.idx(cx + dx, cy + dy);
      if (n < 0) continue;
      if (this.dist[n] < bd && this.edge(c, n)) {
        if (dx !== 0 && dy !== 0 && (!this.cellOpen(g.idx(cx + dx, cy)) || !this.cellOpen(g.idx(cx, cy + dy)))) continue;
        bd = this.dist[n];
        best = n;
      }
    }
    if (best === c) return null;
    return [((best % g.w) + 0.5) * CELL, (((best / g.w) | 0) + 0.5) * CELL];
  }

  /** Path distance in cells (approx) from a world point to the player. */
  cellsTo(x: number, z: number): number {
    const c = this.grid.cellAt(x, z);
    return c < 0 ? INF : this.dist[c] / 10;
  }
}
