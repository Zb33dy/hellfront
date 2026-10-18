import { mulberry32 } from '../core/util';

export type RGBA = [number, number, number, number?];

/**
 * Tiny exact-pixel rasterizer for original pixel art.
 * Alpha convention for sprites: 255 = lit pixel, 128..254 = emissive (glows, ignores lighting), 0 = empty.
 */
export class Pix {
  readonly data: Uint8ClampedArray;
  rand: () => number;
  constructor(readonly w: number, readonly h: number, seed = 1) {
    this.data = new Uint8ClampedArray(w * h * 4);
    this.rand = mulberry32(seed);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): [number, number, number, number] {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  set(x: number, y: number, c: RGBA): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3] ?? 255;
  }

  clear(): void {
    this.data.fill(0);
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** Ellipse with spherical shading lit from the upper left. */
  ell(cx: number, cy: number, rx: number, ry: number, c: RGBA, shade = 0.45): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        const l = 1 + shade * (-dx * 0.55 - dy * 0.75) * 0.8 - shade * d * 0.35;
        this.set(x, y, [c[0] * l, c[1] * l, c[2] * l, c[3] ?? 255]);
      }
  }

  /** Thick capsule between two points, cylindrically shaded. */
  limb(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: RGBA, shade = 0.4): void {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(2, Math.ceil(len * 2));
    const minX = Math.floor(Math.min(x0, x1) - Math.max(r0, r1) - 1), maxX = Math.ceil(Math.max(x0, x1) + Math.max(r0, r1) + 1);
    const minY = Math.floor(Math.min(y0, y1) - Math.max(r0, r1) - 1), maxY = Math.ceil(Math.max(y0, y1) + Math.max(r0, r1) + 1);
    const nx = len > 0 ? -(y1 - y0) / len : 0, ny = len > 0 ? (x1 - x0) / len : 1;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = len > 0 ? ((px - x0) * (x1 - x0) + (py - y0) * (y1 - y0)) / (len * len) : 0;
        t = Math.max(0, Math.min(1, t));
        const qx = x0 + (x1 - x0) * t, qy = y0 + (y1 - y0) * t;
        const r = r0 + (r1 - r0) * t;
        const d = Math.hypot(px - qx, py - qy);
        if (d > r) continue;
        const side = ((px - qx) * nx + (py - qy) * ny) / Math.max(r, 0.5);
        const l = 1 + shade * side * 0.6 - shade * (d / r) * (d / r) * 0.3;
        this.set(x, y, [c[0] * l, c[1] * l, c[2] * l, c[3] ?? 255]);
      }
    void steps;
  }

  poly(pts: [number, number][], c: RGBA): void {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        const yy = y + 0.5;
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  /** Random splatter of a color over existing opaque pixels (blood, dirt). */
  speckle(cx: number, cy: number, r: number, c: RGBA, count: number, onlyOpaque = true): void {
    for (let k = 0; k < count; k++) {
      const a = this.rand() * Math.PI * 2;
      const d = Math.pow(this.rand(), 1.5) * r;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (onlyOpaque && this.alpha(x, y) === 0) continue;
      this.set(x, y, c);
    }
  }

  /** Darken pixels whose upper/left neighbour is empty less than those whose lower/right neighbour is. Adds a dark outline. */
  finish(outline: RGBA = [16, 10, 10], rim = true): void {
    const src = new Uint8ClampedArray(this.data);
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[(y * this.w + x) * 4 + 3]);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        if (src[i + 3] > 0) {
          if (!rim || src[i + 3] < 255) continue;
          let f = 1;
          if (a(x, y - 1) === 0 || a(x - 1, y) === 0) f = 1.22;
          if (a(x, y + 1) === 0 || a(x + 1, y) === 0) f = 0.72;
          this.data[i] = src[i] * f;
          this.data[i + 1] = src[i + 1] * f;
          this.data[i + 2] = src[i + 2] * f;
        } else if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
          this.data[i] = outline[0];
          this.data[i + 1] = outline[1];
          this.data[i + 2] = outline[2];
          this.data[i + 3] = 255;
        }
      }
  }

  /** Copies `src` into this canvas with rotation (radians, about pivot) and scale; nearest sampling. */
  blitTransformed(src: Pix, pivotX: number, pivotY: number, dstX: number, dstY: number, angle: number, sx = 1, sy = 1): void {
    const ca = Math.cos(-angle), sa = Math.sin(-angle);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const dx = (x + 0.5 - dstX) / sx, dy = (y + 0.5 - dstY) / sy;
        const ux = dx * ca - dy * sa + pivotX, uy = dx * sa + dy * ca + pivotY;
        const c = src.get(Math.floor(ux), Math.floor(uy));
        if (c[3] > 0) this.set(x, y, c);
      }
  }

  blit(src: Pix, dx: number, dy: number): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c[3] > 0) this.set(dx + x, dy + y, c);
      }
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale;
    c.height = this.h * scale;
    const ctx = c.getContext('2d')!;
    const img = new ImageData(this.w, this.h);
    // canvas has no emissive channel: show emissive pixels opaque
    for (let i = 0; i < this.data.length; i += 4) {
      img.data[i] = this.data[i];
      img.data[i + 1] = this.data[i + 1];
      img.data[i + 2] = this.data[i + 2];
      img.data[i + 3] = this.data[i + 3] > 0 ? 255 : 0;
    }
    if (scale === 1) {
      ctx.putImageData(img, 0, 0);
    } else {
      const t = document.createElement('canvas');
      t.width = this.w;
      t.height = this.h;
      t.getContext('2d')!.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(t, 0, 0, c.width, c.height);
    }
    return c;
  }
}

/** Emissive color: alpha 128..254 encodes glow strength (128 = full glow). */
export const glow = (r: number, g: number, b: number, strength = 1): RGBA => [r, g, b, Math.round(254 - strength * 126)];
