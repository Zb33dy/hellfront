import { RawTexture, Texture, type Scene } from '@babylonjs/core';
import { TilePainter, makeNoise, type C3 } from './pixel';

// Procedural 64px wall/floor atlas. Alpha channel = 255 - emissive mask.

export const TILE_NAMES = [
  'metalPanel', 'techWall', 'concrete', 'hazard', 'hangarFloor', 'ceilPanel', 'ceilGrid', 'floorGrate',
  'crate', 'shipHull', 'shipWindow', 'bigDoor', 'door', 'doorRed', 'doorBlue', 'bloodWall',
  'computer', 'lightPanel', 'secretWall', 'pipeWall', 'rust', 'concreteBlood', 'liftTop', 'exitPad',
  'closet', 'nukage', 'doorYellow', 'lampMetal', 'flesh', 'hellstone', 'lava',
] as const;
export type TileName = (typeof TILE_NAMES)[number];

export const TILE = Object.fromEntries(TILE_NAMES.map((n, i) => [n, i])) as Record<TileName, number>;
export const TILE_PX = 64;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 4;
export const ATLAS_W = TILE_PX * ATLAS_COLS;
export const ATLAS_H = TILE_PX * ATLAS_ROWS;

export function tileOrigin(name: TileName): [number, number] {
  const i = TILE[name];
  return [(i % ATLAS_COLS) / ATLAS_COLS, Math.floor(i / ATLAS_COLS) / ATLAS_ROWS];
}

const STEEL: C3 = [92, 98, 108];
const YEL: C3 = [214, 168, 40];
const BLK: C3 = [26, 24, 22];
const BLOOD: C3 = [110, 6, 4];
const RUST: C3 = [120, 62, 30];

type Painter = (p: TilePainter) => void;

function metalPanel(p: TilePainter, base: C3 = STEEL) {
  const n = makeNoise(11, 8);
  p.fillNoise(base, 0.08, n, 0.25);
  for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]]) {
    p.bevel(x, y, 32, 32, 1.3, 0.55);
    p.rivet(x + 3, y + 3);
    p.rivet(x + 27, y + 3);
    p.rivet(x + 3, y + 27);
    p.rivet(x + 27, y + 27);
  }
  p.grime(0.45, makeNoise(12, 10));
}

const painters: Record<TileName, Painter> = {
  metalPanel: (p) => metalPanel(p),
  techWall: (p) => {
    p.fillNoise([58, 62, 70], 0.08, makeNoise(21, 8), 0.2);
    p.bevel(0, 0, 64, 26, 1.25, 0.6);
    p.bevel(0, 38, 64, 26, 1.25, 0.6);
    p.rect(0, 26, 64, 12, [30, 32, 36], 0.1);
    for (let x = 2; x < 64; x += 6) p.vline(x, 28, 8, [70, 74, 80]);
    p.groove(8, 6, 20, 14);
    p.groove(36, 6, 20, 14);
    for (const [x, y, c] of [[12, 44, [255, 40, 30]], [16, 44, [40, 255, 90]], [48, 44, [255, 160, 30]]] as [number, number, C3][]) {
      p.rect(x, y, 2, 2, c);
      p.glow(x, y); p.glow(x + 1, y); p.glow(x, y + 1); p.glow(x + 1, y + 1);
    }
    for (let x = 4; x < 60; x += 8) p.rivet(x, 58);
    p.grime(0.35, makeNoise(22, 10));
  },
  concrete: (p) => {
    const n = makeNoise(31, 16);
    p.fillNoise([104, 100, 94], 0.12, n, 0.35);
    const r = p.rand;
    for (let k = 0; k < 3; k++) {
      let x = r() * 64, y = r() * 64;
      for (let j = 0; j < 30; j++) {
        p.shade(x, y, 0.6);
        x += r() < 0.5 ? 1 : 0;
        y += r() < 0.6 ? 1 : -1;
      }
    }
    p.groove(0, 0, 64, 64);
  },
  hazard: (p) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const s = Math.floor((x + y) / 16) % 2 === 0;
        const c = s ? YEL : BLK;
        const n = 1 + (p.rand() - 0.5) * 0.15;
        p.set(x, y, [c[0] * n, c[1] * n, c[2] * n]);
      }
    p.grime(0.55, makeNoise(41, 8));
    p.bevel(0, 0, 64, 64, 1.2, 0.6, 2);
  },
  hangarFloor: (p) => {
    p.fillNoise([70, 72, 74], 0.1, makeNoise(51, 8), 0.2);
    for (let y = 0; y < 64; y += 4)
      for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 64; x += 4) {
        p.shade(x, y, 1.35);
        p.shade(x + 1, y + 1, 0.7);
      }
    p.groove(0, 0, 32, 32);
    p.groove(32, 0, 32, 32);
    p.groove(0, 32, 32, 32);
    p.groove(32, 32, 32, 32);
    p.grime(0.5, makeNoise(52, 12));
  },
  ceilPanel: (p) => {
    p.fillNoise([54, 54, 58], 0.08);
    p.bevel(0, 0, 64, 64, 1.2, 0.5, 2);
    for (let y = 18; y < 46; y += 4) p.rect(16, y, 32, 2, [18, 18, 20]);
    p.bevel(14, 16, 36, 32, 0.6, 1.2);
  },
  ceilGrid: (p) => {
    p.fillNoise([20, 21, 24], 0.1);
    for (const o of [0, 32]) {
      p.rect(o, 0, 5, 64, [66, 68, 72], 0.1);
      p.rect(0, o, 64, 5, [66, 68, 72], 0.1);
      p.bevel(o, 0, 5, 64, 1.3, 0.6);
      p.bevel(0, o, 64, 5, 1.3, 0.6);
    }
    for (let i = 0; i < 32; i++) {
      p.set(5 + i * 0.84, 5 + i * 0.84, [52, 54, 58]);
      p.set(37 + i * 0.84, 37 - i * 0.84 + 26, [52, 54, 58]);
    }
  },
  floorGrate: (p) => {
    p.fillNoise([78, 80, 82], 0.1);
    for (let y = 0; y < 64; y += 8)
      for (let x = 0; x < 64; x += 8) {
        p.rect(x + 2, y + 2, 5, 5, [14, 14, 16]);
        p.shade(x + 2, y + 2, 2.0);
      }
    p.bevel(0, 0, 64, 64, 1.25, 0.55, 2);
    p.grime(0.4, makeNoise(71, 8));
  },
  crate: (p) => {
    p.fillNoise([84, 92, 52], 0.12, makeNoise(81, 8), 0.2);
    p.bevel(0, 0, 64, 64, 1.3, 0.5, 3);
    p.bevel(6, 6, 52, 52, 0.6, 1.25, 1);
    for (let i = 0; i < 52; i++) {
      for (let w = -2; w <= 2; w++) {
        p.set(6 + i, 6 + i + w, [96, 104, 60]);
        p.set(57 - i, 6 + i + w, [96, 104, 60]);
      }
      p.shade(6 + i, 6 + i + 3, 0.5);
      p.shade(57 - i, 6 + i + 3, 0.5);
    }
    p.rect(22, 27, 20, 10, [30, 30, 24]);
    p.rect(24, 29, 3, 6, [200, 180, 80]);
    p.rect(29, 29, 3, 6, [200, 180, 80]);
    p.rect(34, 29, 6, 2, [200, 180, 80]);
    p.rect(36, 31, 2, 4, [200, 180, 80]);
    for (const [x, y] of [[3, 3], [59, 3], [3, 59], [59, 59]]) p.rivet(x, y);
  },
  shipHull: (p) => {
    p.fillNoise([150, 152, 156], 0.06, makeNoise(91, 8), 0.15);
    p.groove(0, 0, 64, 40);
    p.groove(0, 40, 64, 24);
    p.rect(0, 44, 64, 6, [40, 70, 140], 0.08);
    for (let x = 4; x < 64; x += 12) p.rivet(x, 4);
    p.rect(8, 16, 3, 10, [40, 40, 44]);
    p.rect(13, 16, 7, 3, [40, 40, 44]);
    p.rect(13, 23, 7, 3, [40, 40, 44]);
    p.rect(17, 16, 3, 10, [40, 40, 44]);
    p.grime(0.5, makeNoise(92, 10));
  },
  shipWindow: (p) => {
    painters.shipHull(p);
    for (const x of [6, 26, 46]) {
      p.rect(x, 12, 14, 18, [20, 50, 70]);
      for (let j = 0; j < 18; j++) for (let i = 0; i < 14; i++) p.glow(x + i, 12 + j, 70 + (j < 4 ? 80 : 0));
      p.bevel(x - 1, 11, 16, 20, 0.5, 1.4);
    }
  },
  bigDoor: (p) => {
    p.fillNoise([96, 94, 86], 0.08);
    for (let x = 0; x < 64; x += 8) p.bevel(x, 0, 8, 52, 1.3, 0.5);
    for (let y = 52; y < 64; y++)
      for (let x = 0; x < 64; x++) p.set(x, y, Math.floor((x + y) / 8) % 2 ? YEL : BLK);
    p.grime(0.6, makeNoise(111, 10));
  },
  door: (p) => {
    p.fillNoise([110, 112, 116], 0.07);
    p.bevel(0, 0, 64, 64, 1.3, 0.5, 2);
    p.rect(31, 0, 2, 64, [30, 30, 34]);
    for (let y = 8; y < 56; y += 12) {
      for (let i = 0; i < 8; i++) {
        p.set(12 + i, y + i, YEL); p.set(12 + i, y + 16 - i, YEL);
        p.set(44 + i, y + 8 - i, YEL); p.set(44 + i, y + 8 + i, YEL);
      }
    }
    p.groove(4, 4, 24, 56);
    p.groove(36, 4, 24, 56);
    p.grime(0.4, makeNoise(121, 8));
  },
  doorRed: (p) => doorKey(p, [230, 30, 20]),
  doorBlue: (p) => doorKey(p, [40, 90, 255]),
  doorYellow: (p) => doorKey(p, [240, 200, 30]),
  bloodWall: (p) => {
    metalPanel(p);
    p.splatter(20, 22, 10, BLOOD, 5);
    p.splatter(46, 40, 7, BLOOD, 3);
  },
  computer: (p) => {
    p.fillNoise([40, 44, 50], 0.08);
    p.bevel(0, 0, 64, 64, 1.3, 0.5, 2);
    for (const [x, y, w, h] of [[6, 6, 24, 18], [34, 6, 24, 18]]) {
      p.rect(x, y, w, h, [6, 22, 12]);
      for (let j = 2; j < h - 2; j += 3) {
        const len = 4 + Math.floor(p.rand() * (w - 8));
        for (let i = 2; i < len; i++) {
          p.set(x + i, y + j, [60, 230, 120]);
          p.glow(x + i, y + j, 220);
        }
      }
      p.bevel(x - 1, y - 1, w + 2, h + 2, 0.5, 1.4);
    }
    for (let i = 0; i < 6; i++) {
      const c: C3 = [[230, 40, 30], [240, 190, 40], [60, 200, 255]][i % 3] as C3;
      p.rect(8 + i * 8, 32, 5, 4, c);
      for (let a = 0; a < 5; a++) for (let b = 0; b < 4; b++) p.glow(8 + i * 8 + a, 32 + b, 160);
    }
    for (let y = 42; y < 60; y += 4) p.hline(6, y, 52, [26, 28, 32]);
  },
  lightPanel: (p) => {
    p.fillNoise([70, 70, 74], 0.06);
    p.bevel(0, 0, 64, 64, 1.3, 0.5, 2);
    p.rect(8, 8, 48, 48, [255, 244, 210]);
    for (let j = 8; j < 56; j++) for (let i = 8; i < 56; i++) p.glow(i, j, 255);
    for (let i = 8; i < 56; i += 8) p.vline(i, 8, 48, [200, 190, 160]);
    p.bevel(7, 7, 50, 50, 0.5, 1.3);
  },
  secretWall: (p) => {
    painters.techWall(p);
    // subtle misaligned seam and a hairline crack: the only tell
    for (let y = 0; y < 64; y++) p.shade(45, y, 0.55);
    let x = 20;
    for (let y = 30; y < 60; y++) {
      p.shade(x, y, 0.6);
      if (p.rand() < 0.3) x += p.rand() < 0.5 ? 1 : -1;
    }
  },
  pipeWall: (p) => {
    p.fillNoise([60, 58, 54], 0.1, makeNoise(191, 8), 0.3);
    for (const [x, w, c] of [[4, 10, [110, 86, 60]], [20, 6, [90, 96, 100]], [32, 12, [100, 104, 96]], [50, 8, [120, 70, 40]]] as [number, number, C3][]) {
      for (let i = 0; i < w; i++) {
        const f = 0.55 + Math.sin((i / (w - 1)) * Math.PI) * 0.7;
        p.vline(x + i, 0, 64, [c[0] * f, c[1] * f, c[2] * f]);
      }
      p.rect(x - 1, 20, w + 2, 3, [70, 70, 72]);
      p.bevel(x - 1, 20, w + 2, 3);
    }
    p.grime(0.6, makeNoise(192, 8));
    p.splatter(40, 50, 4, RUST, 2);
  },
  rust: (p) => {
    p.fillNoise(RUST, 0.18, makeNoise(201, 8), 0.5);
    p.bevel(0, 0, 64, 32, 1.25, 0.55);
    p.bevel(0, 32, 64, 32, 1.25, 0.55);
    p.grime(0.6, makeNoise(202, 6));
  },
  concreteBlood: (p) => {
    painters.concrete(p);
    p.splatter(30, 34, 16, BLOOD, 0);
    p.splatter(12, 12, 5, BLOOD, 0);
  },
  liftTop: (p) => {
    painters.floorGrate(p);
    for (let i = 0; i < 64; i++)
      for (let w = 0; w < 5; w++) {
        const c = Math.floor((i + w) / 5) % 2 ? YEL : BLK;
        p.set(i, w, c); p.set(i, 63 - w, c); p.set(w, i, c); p.set(63 - w, i, c);
      }
  },
  exitPad: (p) => {
    p.fillNoise([30, 40, 36], 0.08);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        const ring = Math.abs(Math.sin(d * 0.35));
        if (ring > 0.85 && d < 30) {
          p.set(x, y, [80, 255, 160]);
          p.glow(x, y, 230);
        }
      }
    p.bevel(0, 0, 64, 64, 1.3, 0.5, 2);
  },
  closet: (p) => {
    painters.rust(p);
    p.rect(30, 0, 4, 64, [40, 22, 14]);
  },
  nukage: (p) => paintNukage(p),
  lampMetal: (p) => metalPanel(p, [70, 72, 78]),
  flesh: (p) => {
    const n = makeNoise(401, 8);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const v = n(x / 6, y / 6);
        const vein = Math.abs(Math.sin((x + n(x / 10, y / 10) * 30) * 0.25)) < 0.12;
        p.set(x, y, vein ? [70, 10, 14] : [120 + v * 70, 30 + v * 25, 34 + v * 20]);
      }
    for (let k = 0; k < 5; k++) {
      const cx = p.rand() * 64, cy = p.rand() * 64;
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 4) { p.set(cx + i, cy + j, [255, 120, 40]); p.glow(cx + i, cy + j, 160); }
    }
    p.grime(0.4, makeNoise(402, 8));
  },
  hellstone: (p) => {
    p.fillNoise([46, 34, 34], 0.15, makeNoise(411, 8), 0.4);
    for (let y = 0; y < 64; y += 16) {
      p.hline(0, y, 64, [20, 12, 12]);
      for (let x = (y / 16) % 2 ? 8 : 0; x < 64; x += 16) p.vline(x, y, 16, [20, 12, 12]);
    }
    let x = 10, y = 0;
    for (let i = 0; i < 64; i++) {
      p.set(x, y, [255, 90, 20]); p.glow(x, y, 220);
      y++; if (p.rand() < 0.4) x += p.rand() < 0.5 ? -1 : 1;
    }
    p.grime(0.5, makeNoise(412, 8));
  },
  lava: (p) => paintLava(p),
};

function doorKey(p: TilePainter, c: C3) {
  painters.door(p);
  p.rect(0, 26, 64, 12, [c[0] * 0.6, c[1] * 0.6, c[2] * 0.6]);
  p.rect(4, 29, 56, 6, c);
  for (let i = 4; i < 60; i++) for (let j = 29; j < 35; j++) p.glow(i, j, 200);
  p.bevel(0, 26, 64, 12, 1.3, 0.5);
}

function paintNukage(p: TilePainter) {
  const n1 = makeNoise(301, 8);
  const n2 = makeNoise(302, 16);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const v = n1(x / 8, y / 8) * 0.6 + n2(x / 4, y / 4) * 0.4;
      const b = Math.pow(v, 2.2);
      p.set(x, y, [30 + 120 * b, 120 + 135 * b, 20 + 60 * b]);
    }
}

let atlasData: Uint8Array | null = null;
let nukageData: Uint8Array | null = null;

function buildAtlas(): Uint8Array {
  const buf = new Uint8Array(ATLAS_W * ATLAS_H * 4);
  TILE_NAMES.forEach((name, i) => {
    const ox = (i % ATLAS_COLS) * TILE_PX;
    const oy = Math.floor(i / ATLAS_COLS) * TILE_PX;
    const p = new TilePainter(buf, ATLAS_W, ox, oy, TILE_PX, 1000 + i * 77);
    painters[name](p);
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) buf[((oy + y) * ATLAS_W + ox + x) * 4 + 3] = 255 - p.emissive[y * TILE_PX + x];
  });
  return buf;
}

function paintLava(p: TilePainter) {
  const n1 = makeNoise(501, 8);
  const n2 = makeNoise(502, 16);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const v = n1(x / 8, y / 8) * 0.6 + n2(x / 4, y / 4) * 0.4;
      const b = Math.pow(v, 1.8);
      const crust = v < 0.35;
      p.set(x, y, crust ? [50 + 40 * b, 18, 10] : [200 + 55 * b, 70 + 150 * b, 10 + 60 * b * b]);
    }
}

let lavaData: Uint8Array | null = null;
export function getLavaTexture(scene: Scene): RawTexture {
  if (!lavaData) {
    lavaData = new Uint8Array(64 * 64 * 4);
    paintLava(new TilePainter(lavaData, 64, 0, 0, 64, 11));
  }
  const t = RawTexture.CreateRGBATexture(lavaData, 64, 64, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
  t.wrapU = Texture.WRAP_ADDRESSMODE;
  t.wrapV = Texture.WRAP_ADDRESSMODE;
  return t;
}

function buildNukage(): Uint8Array {
  const buf = new Uint8Array(64 * 64 * 4);
  paintNukage(new TilePainter(buf, 64, 0, 0, 64, 9));
  return buf;
}

export function getAtlasTexture(scene: Scene): RawTexture {
  atlasData ??= buildAtlas();
  const t = RawTexture.CreateRGBATexture(atlasData, ATLAS_W, ATLAS_H, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
  t.wrapU = Texture.CLAMP_ADDRESSMODE;
  t.wrapV = Texture.CLAMP_ADDRESSMODE;
  t.hasAlpha = false;
  return t;
}

export function getNukageTexture(scene: Scene): RawTexture {
  nukageData ??= buildNukage();
  const t = RawTexture.CreateRGBATexture(nukageData, 64, 64, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
  t.wrapU = Texture.WRAP_ADDRESSMODE;
  t.wrapV = Texture.WRAP_ADDRESSMODE;
  return t;
}

/** Atlas as a data URL — used by the CSS of the menus (hazard stripes, metal). */
export function tileDataURL(name: TileName, scale = 2): string {
  atlasData ??= buildAtlas();
  const i = TILE[name];
  const ox = (i % ATLAS_COLS) * TILE_PX;
  const oy = Math.floor(i / ATLAS_COLS) * TILE_PX;
  const c = document.createElement('canvas');
  c.width = c.height = TILE_PX * scale;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(TILE_PX, TILE_PX);
  for (let y = 0; y < TILE_PX; y++)
    for (let x = 0; x < TILE_PX; x++) {
      const s = ((oy + y) * ATLAS_W + ox + x) * 4;
      const d = (y * TILE_PX + x) * 4;
      img.data[d] = atlasData[s];
      img.data[d + 1] = atlasData[s + 1];
      img.data[d + 2] = atlasData[s + 2];
      img.data[d + 3] = 255;
    }
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = TILE_PX;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, c.width, c.height);
  return c.toDataURL();
}
