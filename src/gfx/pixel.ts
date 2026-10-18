import { mulberry32 } from '../core/util';

export type C3 = [number, number, number];

/** Periodic value noise in [0,1] — tiles seamlessly over `period` pixels. */
export function makeNoise(seed: number, period: number): (x: number, y: number) => number {
  const r = mulberry32(seed);
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const g = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  return (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/**
 * Small RGBA painter over a square tile inside a larger buffer.
 * Coordinates wrap, so everything painted is seamlessly tileable.
 * A separate emissive mask (0..255) is stored in alpha later.
 */
export class TilePainter {
  readonly rand: () => number;
  readonly emissive: Uint8Array;
  constructor(
    readonly buf: Uint8Array,
    readonly stride: number,
    readonly ox: number,
    readonly oy: number,
    readonly size: number,
    seed: number,
  ) {
    this.rand = mulberry32(seed);
    this.emissive = new Uint8Array(size * size);
  }

  private idx(x: number, y: number): number {
    const s = this.size;
    const wx = ((Math.floor(x) % s) + s) % s;
    const wy = ((Math.floor(y) % s) + s) % s;
    return ((this.oy + wy) * this.stride + this.ox + wx) * 4;
  }

  get(x: number, y: number): C3 {
    const i = this.idx(x, y);
    return [this.buf[i], this.buf[i + 1], this.buf[i + 2]];
  }

  set(x: number, y: number, c: C3): void {
    const i = this.idx(x, y);
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
    this.buf[i + 3] = 255;
  }

  glow(x: number, y: number, v = 255): void {
    const s = this.size;
    const wx = ((Math.floor(x) % s) + s) % s;
    const wy = ((Math.floor(y) % s) + s) % s;
    this.emissive[wy * s + wx] = Math.max(this.emissive[wy * s + wx], v);
  }

  /** Multiply existing color by f (per channel or scalar). */
  shade(x: number, y: number, f: number): void {
    const c = this.get(x, y);
    this.set(x, y, [c[0] * f, c[1] * f, c[2] * f]);
  }

  tint(x: number, y: number, c: C3, a: number): void {
    const o = this.get(x, y);
    this.set(x, y, [o[0] + (c[0] - o[0]) * a, o[1] + (c[1] - o[1]) * a, o[2] + (c[2] - o[2]) * a]);
  }

  fillNoise(base: C3, amount: number, noise?: (x: number, y: number) => number, noiseAmt = 0): void {
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) {
        const n = (this.rand() - 0.5) * amount + (noise ? (noise(x / 8, y / 8) - 0.5) * noiseAmt : 0);
        this.set(x, y, [base[0] * (1 + n), base[1] * (1 + n), base[2] * (1 + n)]);
      }
  }

  rect(x: number, y: number, w: number, h: number, c: C3, jitter = 0): void {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const n = jitter ? 1 + (this.rand() - 0.5) * jitter : 1;
        this.set(x + i, y + j, [c[0] * n, c[1] * n, c[2] * n]);
      }
  }

  shadeRect(x: number, y: number, w: number, h: number, f: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.shade(x + i, y + j, f);
  }

  /** Raised panel: highlight on top/left edge, shadow bottom/right. */
  bevel(x: number, y: number, w: number, h: number, hi = 1.35, lo = 0.55, width = 1): void {
    for (let k = 0; k < width; k++) {
      for (let i = k; i < w - k; i++) {
        this.shade(x + i, y + k, hi);
        this.shade(x + i, y + h - 1 - k, lo);
      }
      for (let j = k + 1; j < h - 1 - k; j++) {
        this.shade(x + k, y + j, hi);
        this.shade(x + w - 1 - k, y + j, lo);
      }
    }
  }

  /** Recessed groove (inverse bevel). */
  groove(x: number, y: number, w: number, h: number): void {
    this.bevel(x, y, w, h, 0.5, 1.25, 1);
  }

  rivet(x: number, y: number): void {
    this.shade(x, y, 1.5);
    this.shade(x + 1, y, 1.2);
    this.shade(x, y + 1, 1.1);
    this.shade(x + 1, y + 1, 0.55);
  }

  hline(x: number, y: number, w: number, c: C3): void {
    for (let i = 0; i < w; i++) this.set(x + i, y, c);
  }
  vline(x: number, y: number, h: number, c: C3): void {
    for (let j = 0; j < h; j++) this.set(x, y + j, c);
  }

  /** Dark grime gathering toward the bottom of the tile. */
  grime(strength: number, noise: (x: number, y: number) => number): void {
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) {
        const n = noise(x / 6, y / 6);
        const f = 1 - strength * Math.max(0, n - 0.45) * 1.8;
        this.shade(x, y, f);
      }
  }

  splatter(cx: number, cy: number, radius: number, color: C3, drips = 0): void {
    const r = this.rand;
    for (let k = 0; k < radius * radius * 2.5; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 1.6) * radius;
      this.tint(cx + Math.cos(a) * d, cy + Math.sin(a) * d, color, 0.75 + r() * 0.25);
    }
    for (let k = 0; k < drips; k++) {
      let x = cx + (r() - 0.5) * radius * 1.4;
      let y = cy;
      const len = 4 + r() * 14;
      for (let j = 0; j < len; j++) {
        this.tint(x, y + j, color, 0.8);
        if (r() < 0.1) x += r() < 0.5 ? -1 : 1;
      }
      y += len;
    }
  }
}
