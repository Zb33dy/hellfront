import { RawTexture, Texture, type Scene } from '@babylonjs/core';
import { Pix, glow, type RGBA } from './pixart';
import { breachCore, executioner, hellbolt, ironclad, warden, type Pose } from './spritesCh23';
import { beamSeg, chainLink, jumpRing, bolterPickup, boltsBox, flameJet, flamerPickup, fuelCan, hellShield, heresyBolt, hereticMarine, sorcerer, soulOrb } from './spritesHeretic';
import { acidOrb, archon, bulwark, harrier, sigilRing } from './spritesCh6';
import { boneShard, eruptionMark, grenadePickup, grenadeSprite, launcherPickup, rocketsBox, rocketSprite, roundsBox, sniperPickup, sovereign, warhound, wraith } from './spritesCh45';

// Original procedural pixel-art sprites for enemies, pickups, props and projectiles.
// Everything is packed into one atlas so all billboards render in a single draw call.
// To swap in hand-drawn PNG sheets later, replace `buildFrames()` with a loader that fills the same registry.

export interface SpriteFrame {
  u0: number; v0: number; u1: number; v1: number;
  w: number; h: number; // world size
  anchor: 'bottom' | 'center';
}

export const PPU = 32; // sprite pixels per world unit
const ATLAS = 2048;

export const SPRITES: Record<string, SpriteFrame> = {};
let atlasData: Uint8Array | null = null;

const BLOOD: RGBA = [128, 8, 6];
const BLOOD_D: RGBA = [80, 4, 4];
const BONE: RGBA = [222, 208, 178];

// ------------------------------------------------------------------ Zombieman (possessed base trooper)

interface ZPose {
  bob?: number;
  lFoot?: [number, number];
  rFoot?: [number, number];
  aim?: boolean;
  fire?: boolean;
  pain?: boolean;
  limp?: boolean;
}

function zombie(p: ZPose): Pix {
  const s = new Pix(64, 64, 7);
  const b = p.bob ?? 0;
  const FAT: RGBA = [92, 98, 72], FAT_D: RGBA = [66, 70, 52], VEST: RGBA = [50, 52, 48], SKIN: RGBA = [156, 164, 140];
  const BOOT: RGBA = [38, 34, 30], GUN: RGBA = [42, 42, 46];
  const lf = p.lFoot ?? [27, 62], rf = p.rFoot ?? [37, 62];
  // legs
  s.limb(28, 40 + b, lf[0], lf[1] - 2, 3.6, 3, FAT_D);
  s.limb(36, 40 + b, rf[0], rf[1] - 2, 3.6, 3, FAT_D);
  s.ell(lf[0], lf[1] - 1, 3.8, 2.2, BOOT);
  s.ell(rf[0], rf[1] - 1, 3.8, 2.2, BOOT);
  // torso
  const ty = p.pain ? -1 : 0;
  s.ell(32, 41 + b, 8, 4, FAT);
  s.ell(32, 31 + b + ty, 9.5, 11, VEST);
  s.rect(26, 27 + b + ty, 12, 3, [70, 72, 64]);
  s.rect(28, 34 + b + ty, 3, 4, [60, 62, 56]);
  s.rect(33, 34 + b + ty, 3, 4, [60, 62, 56]);
  // head
  const hx = p.pain ? 33 : 32, hy = (p.pain ? 13 : 15) + b + ty;
  s.ell(hx, hy, 5.5, 6.5, SKIN);
  s.rect(hx - 4, hy - 6, 8, 2, [96, 100, 88]);
  s.set(hx - 2, hy - 1, glow(255, 40, 20));
  s.set(hx + 2, hy - 1, glow(255, 40, 20));
  s.line(hx - 2, hy + 3, hx + 2, hy + 3, [60, 20, 20]);
  s.set(hx - 3, hy + 1, [110, 120, 100]);
  s.ell(23, 23 + b + ty, 4, 3, VEST);
  s.ell(41, 23 + b + ty, 4, 3, VEST);
  if (p.limp) {
    s.limb(23, 24 + b, 21, 40 + b, 2.8, 2.4, FAT);
    s.limb(41, 24 + b, 43, 40 + b, 2.8, 2.4, FAT);
    s.ell(21, 41 + b, 2.2, 2.2, SKIN);
    s.ell(43, 41 + b, 2.2, 2.2, SKIN);
  } else if (p.aim || p.fire) {
    // rifle pointed at the viewer: foreshortened
    s.limb(23, 24 + b, 29, 31 + b, 2.8, 2.4, FAT);
    s.limb(41, 24 + b, 35, 30 + b, 2.8, 2.4, FAT);
    s.rect(28, 27 + b, 9, 7, GUN);
    s.rect(30, 25 + b, 5, 3, [70, 70, 76]);
    s.ell(32, 30 + b, 2.6, 2.6, [24, 24, 26]);
    s.set(32, 30 + b, [8, 8, 8]);
    s.ell(29, 32 + b, 2, 2, SKIN);
    s.ell(36, 31 + b, 2, 2, SKIN);
    if (p.fire) {
      s.ell(32, 30 + b, 7, 6, glow(255, 200, 90, 1), 0);
      s.ell(32, 30 + b, 4, 3.5, glow(255, 250, 220, 1), 0);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        s.line(32, 30 + b, 32 + Math.cos(a) * 10, 30 + b + Math.sin(a) * 8, glow(255, 170, 60, 0.9));
      }
    }
  } else if (p.pain) {
    s.limb(23, 22 + b + ty, 15, 16 + b, 2.8, 2.4, FAT);
    s.limb(41, 22 + b + ty, 48, 18 + b, 2.8, 2.4, FAT);
    s.ell(15, 15 + b, 2.2, 2.2, SKIN);
    s.ell(48, 17 + b, 2.2, 2.2, SKIN);
    s.limb(12, 30 + b, 26, 22 + b, 1.6, 1.6, GUN);
  } else {
    // rifle held across the chest
    s.limb(23, 24 + b, 27, 35 + b, 2.8, 2.4, FAT);
    s.limb(41, 24 + b, 39, 31 + b, 2.8, 2.4, FAT);
    s.poly([[18, 39 + b], [44, 26 + b], [46, 29 + b], [20, 42 + b]], GUN);
    s.line(19, 40 + b, 45, 27 + b, [92, 92, 100]);
    s.rect(30, 34 + b, 3, 5, [34, 34, 36]);
    s.ell(27, 36 + b, 2, 2, SKIN);
    s.ell(39, 31 + b, 2, 2, SKIN);
  }
  if (p.pain) s.speckle(31, 30 + b, 6, BLOOD, 40);
  s.speckle(30, 33, 8, [70, 76, 60], 12);
  s.finish();
  return s;
}

// ------------------------------------------------------------------ Imp (spined, hunched demon)

interface IPose {
  bob?: number;
  lFoot?: [number, number];
  rFoot?: [number, number];
  cast?: boolean;
  throw?: boolean;
  claw?: boolean;
  pain?: boolean;
  limp?: boolean;
}

function imp(p: IPose): Pix {
  const s = new Pix(64, 64, 11);
  const b = p.bob ?? 0;
  const SK: RGBA = [134, 76, 50], SK_D: RGBA = [92, 48, 34], BELLY: RGBA = [160, 104, 70];
  const lf = p.lFoot ?? [25, 62], rf = p.rFoot ?? [39, 62];
  // digitigrade legs
  s.limb(28, 42 + b, 23, 52 + b, 4, 3, SK_D);
  s.limb(23, 52 + b, lf[0], lf[1] - 1, 3, 2.4, SK_D);
  s.limb(36, 42 + b, 41, 52 + b, 4, 3, SK_D);
  s.limb(41, 52 + b, rf[0], rf[1] - 1, 3, 2.4, SK_D);
  for (const f of [lf, rf]) {
    s.ell(f[0], f[1] - 1, 3.5, 1.8, SK_D);
    s.set(f[0] - 3, f[1] - 1, BONE);
    s.set(f[0] + 3, f[1] - 1, BONE);
  }
  // torso (hunched)
  const ty = p.pain ? -2 : 0;
  s.ell(32, 33 + b + ty, 10, 12, SK);
  s.ell(32, 36 + b + ty, 6, 7, BELLY);
  for (let k = 0; k < 4; k++) s.line(27, 30 + k * 3 + b + ty, 37, 30 + k * 3 + b + ty, SK_D);
  // shoulder spikes
  for (const sx of [-1, 1]) {
    const x = 32 + sx * 10;
    s.poly([[x - 2, 24 + b + ty], [x + 2, 24 + b + ty], [x + sx * 5, 14 + b + ty]], BONE);
    s.poly([[x - 1, 27 + b + ty], [x + 2, 27 + b + ty], [x + sx * 7, 21 + b + ty]], BONE);
  }
  // head
  const hx = 32 + (p.pain ? 1 : 0), hy = (p.pain ? 15 : 18) + b + ty;
  s.ell(hx, hy, 6.5, 6, SK);
  s.poly([[hx - 5, hy - 3], [hx - 9, hy - 10], [hx - 2, hy - 5]], BONE);
  s.poly([[hx + 5, hy - 3], [hx + 9, hy - 10], [hx + 2, hy - 5]], BONE);
  s.rect(hx - 4, hy - 1, 3, 2, glow(255, 150, 20));
  s.rect(hx + 2, hy - 1, 3, 2, glow(255, 150, 20));
  const mouthOpen = p.cast || p.claw || p.pain;
  s.rect(hx - 3, hy + 3, 7, mouthOpen ? 3 : 1, [40, 6, 6]);
  for (let i = -3; i <= 3; i += 2) s.set(hx + i, hy + 3, BONE);
  const arm = (sx: number, ex: number, ey: number, hx2: number, hy2: number) => {
    s.limb(32 + sx * 9, 26 + b + ty, ex, ey, 3, 2.4, SK);
    s.limb(ex, ey, hx2, hy2, 2.4, 2, SK);
    for (let k = -1; k <= 1; k++) s.line(hx2, hy2, hx2 + k * 2 + sx, hy2 + 4, BONE);
  };
  if (p.cast) {
    arm(-1, 21, 32 + b, 24, 40 + b);
    arm(1, 46, 18 + b, 44, 8 + b);
    s.ell(44, 6 + b, 6, 6, glow(255, 120, 20, 1), 0);
    s.ell(44, 6 + b, 3.5, 3.5, glow(255, 230, 120, 1), 0);
  } else if (p.throw) {
    arm(-1, 21, 32 + b, 22, 42 + b);
    s.limb(41, 26 + b, 37, 33 + b, 3.6, 3.4, SK);
    s.ell(36, 34 + b, 5, 5, SK);
    for (let k = -2; k <= 2; k++) s.set(36 + k * 2, 30 + b, BONE);
    s.ell(36, 33 + b, 4, 4, glow(255, 140, 30, 0.8), 0);
  } else if (p.claw) {
    arm(-1, 18, 22 + b, 13, 14 + b);
    arm(1, 44, 34 + b, 40, 44 + b);
    for (let k = 0; k < 3; k++) s.line(12 + k * 3, 10 + b, 44 + k * 3, 48 + b, [255, 255, 255, 200]);
  } else if (p.pain) {
    arm(-1, 18, 22 + b, 12, 16 + b);
    arm(1, 46, 22 + b, 52, 16 + b);
    s.speckle(32, 33 + b, 7, BLOOD, 45);
  } else if (p.limp) {
    arm(-1, 22, 36 + b, 21, 46 + b);
    arm(1, 42, 36 + b, 43, 46 + b);
  } else {
    arm(-1, 20, 34 + b, 22, 44 + b);
    arm(1, 44, 34 + b, 42, 44 + b);
  }
  s.finish([18, 8, 6]);
  return s;
}

// ------------------------------------------------------------------ Pinky (charging brute)

interface PPose {
  bob?: number;
  lFoot?: [number, number];
  rFoot?: [number, number];
  jaw?: number; // 0 closed .. 1 wide
  pain?: boolean;
}

function pinky(p: PPose): Pix {
  const s = new Pix(72, 56, 13);
  const b = p.bob ?? 0;
  const SK: RGBA = [206, 112, 120], SK_D: RGBA = [150, 70, 82], PLATE: RGBA = [214, 182, 150];
  const lf = p.lFoot ?? [22, 55], rf = p.rFoot ?? [50, 55];
  // legs
  s.limb(26, 36 + b, lf[0], lf[1] - 3, 6, 5, SK_D);
  s.limb(46, 36 + b, rf[0], rf[1] - 3, 6, 5, SK_D);
  for (const f of [lf, rf]) {
    s.ell(f[0], f[1] - 2, 6, 2.6, [120, 56, 60]);
    for (let k = -1; k <= 1; k++) s.set(f[0] + k * 3, f[1] - 1, BONE);
  }
  // body hump
  const hy = p.pain ? -2 : 0;
  s.ell(36, 28 + b + hy, 22, 15, SK);
  for (let k = 0; k < 5; k++) s.ell(18 + k * 9, 15 + b + hy + Math.abs(k - 2), 4, 3, PLATE);
  // small arms
  s.limb(16, 30 + b, 12, 40 + b, 3.2, 2.6, SK_D);
  s.limb(56, 30 + b, 60, 40 + b, 3.2, 2.6, SK_D);
  for (const x of [12, 60]) for (let k = -1; k <= 1; k++) s.line(x, 40 + b, x + k * 2, 44 + b, BONE);
  // head + maw
  const jaw = p.jaw ?? 0.25;
  const cy = 30 + b + hy;
  s.ell(36, cy, 13, 10, SK);
  s.ell(30, cy - 7, 2.2, 1.6, glow(255, 220, 40, 0.9));
  s.ell(42, cy - 7, 2.2, 1.6, glow(255, 220, 40, 0.9));
  s.line(26, cy - 10, 33, cy - 8, SK_D);
  s.line(46, cy - 10, 39, cy - 8, SK_D);
  const mh = 2 + jaw * 10;
  s.ell(36, cy + 1 + mh / 2, 10, Math.max(1.5, mh / 2 + 1), [60, 8, 12], 0.1);
  s.ell(36, cy + 3 + mh / 2, 6, Math.max(1, mh / 3), [140, 30, 40], 0.2);
  for (let i = -8; i <= 8; i += 2) {
    const tl = 2 + (Math.abs(i) < 6 ? 1 : 0);
    s.line(36 + i, cy - 1, 36 + i, cy - 1 + tl, BONE);
    s.line(36 + i + 1, cy + 2 + mh, 36 + i + 1, cy + 2 + mh - tl, BONE);
  }
  if (jaw > 0.6) for (let k = 0; k < 3; k++) s.line(31 + k * 4, cy + 4 + mh, 31 + k * 4, cy + 9 + mh, [220, 200, 210, 200]);
  if (p.pain) s.speckle(36, 30 + b, 12, BLOOD, 70);
  s.speckle(36, 26, 18, SK_D, 40);
  s.finish([30, 8, 12]);
  return s;
}

// ------------------------------------------------------------------ deaths, gibs (transforms of a limp pose)

function deathFrames(base: Pix, w: number, h: number, poolRx: number): Pix[] {
  const out: Pix[] = [];
  const ground = h - 1;
  const steps: [number, number, number, number, number, number][] = [
    // angle, pivotX, pivotY, dstX, dstY, scaleY
    [0.12, w / 2, ground, w / 2, ground, 0.96],
    [0.55, w / 2, ground, w / 2 + 2, ground, 0.92],
    [1.05, w / 2, h * 0.75, w / 2 + 3, ground - 3, 0.85],
    [1.5, w / 2, h * 0.6, w / 2, ground - 5, 0.8],
  ];
  steps.forEach(([a, px, py, dx, dy, sy], k) => {
    const f = new Pix(w, h, 20 + k);
    if (k >= 2) f.ell(w / 2, ground - 1, poolRx * (0.5 + k * 0.2), 2.4, BLOOD_D, 0);
    f.blitTransformed(base, px, py, dx, dy, a, 1, sy);
    f.speckle(w / 2, h * 0.6, w * 0.3, BLOOD, 30 + k * 20);
    out.push(f);
  });
  // corpse: final + bigger pool
  const c = new Pix(w, h, 99);
  c.ell(w / 2, ground - 1, poolRx * 1.25, 3, BLOOD_D, 0);
  c.blitTransformed(base, w / 2, h * 0.6, w / 2, ground - 5, 1.52, 1, 0.8);
  c.speckle(w / 2, ground - 4, w * 0.35, BLOOD, 60);
  out.push(c);
  return out;
}

function gibFrames(base: Pix, w: number, h: number): Pix[] {
  const out: Pix[] = [];
  for (let k = 0; k < 4; k++) {
    const f = new Pix(w, h, 50 + k);
    const ground = h - 1;
    if (k === 0) {
      f.blit(base, 0, 0);
      f.speckle(w / 2, h * 0.45, w * 0.35, BLOOD, 260, false);
      f.speckle(w / 2, h * 0.45, w * 0.25, [200, 30, 20], 80, false);
    } else {
      // lower body only, sinking, with flying chunks
      const legs = new Pix(w, h, 1);
      for (let y = Math.floor(h * 0.62); y < h; y++) for (let x = 0; x < w; x++) legs.set(x, y, base.get(x, y));
      if (k < 3) f.blitTransformed(legs, w / 2, ground, w / 2, ground, 0.2 * k, 1, 1 - k * 0.2);
      for (let c = 0; c < 9 - k * 2; c++) {
        const cx = f.rand() * w, cy = h * (0.15 + f.rand() * 0.5) + k * 6;
        f.ell(cx, Math.min(cy, ground - 2), 2 + f.rand() * 2.5, 1.6 + f.rand() * 2, f.rand() < 0.3 ? BONE : BLOOD);
      }
      f.ell(w / 2, ground - 1, w * 0.18 + k * 4, 2 + k * 0.6, BLOOD_D, 0);
      if (k === 3) {
        for (let c = 0; c < 7; c++) f.ell(w / 2 + (f.rand() - 0.5) * w * 0.5, ground - 3 - f.rand() * 3, 2.5, 2, [120 + f.rand() * 60, 20, 16]);
        f.ell(w / 2 - 4, ground - 4, 3, 1.4, BONE);
      }
    }
    f.finish([30, 4, 4]);
    out.push(f);
  }
  return out;
}

// ------------------------------------------------------------------ items & props

function healthSmall(): Pix {
  const s = new Pix(20, 14, 3);
  s.rect(1, 2, 18, 11, [210, 214, 220]);
  s.rect(8, 4, 4, 7, [200, 20, 20]);
  s.rect(6, 6, 8, 3, [200, 20, 20]);
  s.rect(1, 2, 18, 1, [240, 244, 250]);
  s.finish();
  return s;
}
function healthLarge(): Pix {
  const s = new Pix(30, 24, 4);
  s.rect(9, 1, 12, 3, [60, 60, 66]);
  s.rect(1, 4, 28, 19, [220, 224, 230]);
  s.rect(12, 7, 6, 13, [210, 20, 20]);
  s.rect(8, 11, 14, 5, [210, 20, 20]);
  s.rect(1, 18, 28, 2, [150, 150, 160]);
  s.finish();
  return s;
}
function armorVest(): Pix {
  const s = new Pix(32, 28, 5);
  const G: RGBA = [60, 150, 70];
  s.poly([[4, 2], [11, 2], [16, 7], [21, 2], [28, 2], [30, 26], [2, 26]], G);
  s.rect(6, 10, 20, 3, [40, 110, 50]);
  s.rect(6, 17, 20, 3, [40, 110, 50]);
  s.rect(14, 12, 4, 4, glow(140, 255, 150, 0.6));
  s.finish();
  return s;
}
function bulletClip(): Pix {
  const s = new Pix(12, 18, 6);
  s.rect(3, 4, 6, 13, [50, 52, 58]);
  s.rect(4, 1, 4, 3, [210, 170, 70]);
  s.rect(3, 9, 6, 1, [80, 82, 90]);
  s.finish();
  return s;
}
function bulletBox(): Pix {
  const s = new Pix(28, 18, 7);
  s.rect(1, 5, 26, 12, [88, 96, 56]);
  for (let x = 3; x < 25; x += 3) {
    s.rect(x, 1, 2, 4, [220, 180, 80]);
    s.set(x, 1, [250, 220, 140]);
  }
  s.rect(9, 9, 10, 4, [40, 40, 30]);
  s.finish();
  return s;
}
function shells(n = 4, boxed = false): Pix {
  const s = new Pix(boxed ? 30 : 22, boxed ? 20 : 12, 8);
  if (boxed) {
    s.rect(1, 7, 28, 12, [150, 30, 24]);
    s.rect(4, 11, 22, 4, [230, 200, 160]);
    for (let x = 3; x < 27; x += 4) {
      s.rect(x, 1, 3, 6, [190, 30, 26]);
      s.rect(x, 5, 3, 2, [220, 180, 80]);
    }
  } else {
    for (let k = 0; k < n; k++) {
      s.rect(1 + k * 5, 2, 4, 8, [200, 32, 28]);
      s.rect(1 + k * 5, 8, 4, 3, [220, 180, 80]);
    }
  }
  s.finish();
  return s;
}
function keycard(c: RGBA): Pix {
  const s = new Pix(18, 14, 9);
  s.rect(1, 2, 16, 11, [220, 220, 226]);
  s.rect(1, 5, 16, 4, glow(c[0], c[1], c[2], 0.9));
  s.rect(3, 10, 6, 1, [90, 90, 100]);
  s.finish();
  return s;
}
function shotgunPickup(): Pix {
  const s = new Pix(56, 16, 10);
  s.rect(2, 6, 34, 3, [50, 50, 56]);
  s.rect(2, 9, 30, 2, [40, 40, 44]);
  s.rect(18, 9, 12, 3, [120, 80, 46]);
  s.poly([[34, 5], [44, 5], [54, 11], [52, 15], [42, 12], [34, 11]], [118, 76, 42]);
  s.rect(32, 4, 4, 8, [60, 60, 66]);
  s.finish();
  return s;
}
function chainswordPickup(): Pix {
  const s = new Pix(60, 18, 12);
  s.rect(2, 6, 40, 6, [150, 156, 166]);
  for (let x = 2; x < 42; x += 3) {
    s.set(x, 5, [230, 230, 236]);
    s.set(x, 12, [230, 230, 236]);
  }
  s.rect(42, 3, 10, 12, [150, 30, 24]);
  s.rect(44, 5, 6, 3, [220, 180, 60]);
  s.rect(52, 7, 6, 4, [40, 40, 44]);
  s.finish();
  return s;
}
function barrel(): Pix {
  const s = new Pix(28, 38, 14);
  s.rect(3, 6, 22, 31, [60, 92, 52]);
  for (let x = 3; x < 25; x++) {
    const f = 0.65 + Math.sin(((x - 3) / 21) * Math.PI) * 0.55;
    for (let y = 6; y < 37; y++) {
      const c = s.get(x, y);
      s.set(x, y, [c[0] * f, c[1] * f, c[2] * f]);
    }
  }
  s.rect(3, 13, 22, 2, [40, 60, 36]);
  s.rect(3, 28, 22, 2, [40, 60, 36]);
  s.rect(10, 18, 8, 7, [214, 168, 40]);
  s.rect(13, 19, 2, 5, [30, 30, 20]);
  s.ell(14, 6, 11, 3, [50, 76, 44]);
  s.ell(14, 6, 8, 2, glow(120, 255, 90, 0.9), 0);
  s.speckle(14, 30, 10, [40, 50, 30], 25);
  s.finish();
  return s;
}
function lamp(): Pix {
  const s = new Pix(16, 64, 15);
  s.rect(6, 12, 4, 50, [70, 72, 78]);
  s.rect(2, 59, 12, 5, [50, 52, 56]);
  s.ell(8, 8, 6, 6, [60, 62, 66]);
  s.ell(8, 8, 4, 5, glow(255, 240, 200, 1), 0);
  s.finish();
  return s;
}
function techColumn(): Pix {
  const s = new Pix(28, 64, 16);
  s.rect(3, 2, 22, 62, [64, 68, 76]);
  s.rect(6, 8, 16, 12, [8, 30, 16]);
  for (let y = 10; y < 19; y += 2) s.rect(7, y, 4 + ((y * 7) % 10), 1, glow(80, 255, 140, 0.9));
  s.rect(6, 26, 16, 6, [20, 22, 26]);
  for (let k = 0; k < 4; k++) s.rect(7 + k * 4, 28, 2, 2, glow(...([[255, 60, 40], [255, 200, 40], [60, 200, 255], [80, 255, 120]][k] as [number, number, number]), 0.9));
  s.rect(3, 40, 22, 2, [40, 42, 48]);
  s.rect(3, 52, 22, 2, [40, 42, 48]);
  s.finish();
  return s;
}
function fireball(k: number): Pix {
  const s = new Pix(20, 20, 30 + k);
  s.ell(10, 10, 8 + k, 7 + k * 0.5, glow(255, 90, 10, 0.8), 0);
  s.ell(10, 10, 6, 5.5, glow(255, 170, 40, 1), 0);
  s.ell(9.5, 9.5, 3.4, 3.2, glow(255, 250, 200, 1), 0);
  for (let i = 0; i < 10; i++) s.set(2 + s.rand() * 16, 2 + s.rand() * 16, glow(255, 200, 80, 1));
  return s;
}
function fireImpact(k: number): Pix {
  const s = new Pix(36, 36, 40 + k);
  const r = 7 + k * 5;
  s.ell(18, 18, r, r, glow(255, 100 - k * 20, 10, 0.9 - k * 0.2), 0);
  s.ell(18, 18, r * 0.6, r * 0.6, glow(255, 210, 90, 1 - k * 0.25), 0);
  if (k > 0) s.ell(18, 18, r * 0.35 * k, r * 0.35 * k, [0, 0, 0, 0], 0);
  return s;
}
function teleFog(k: number): Pix {
  const s = new Pix(40, 64, 60 + k);
  for (let i = 0; i < 120 - k * 25; i++) {
    const x = 20 + (s.rand() - 0.5) * (14 + k * 8);
    const y = 63 - s.rand() * (40 + k * 8);
    s.rect(x, y, 2, 2, glow(120 + s.rand() * 100, 255, 140, 1));
  }
  s.ell(20, 40 - k * 3, 9 - k * 2, 16 - k * 3, glow(100, 255, 160, 0.6), 0);
  return s;
}
function chunk(k: number): Pix {
  const s = new Pix(10, 10, 70 + k);
  s.ell(5, 5, 3.5 + (k % 2), 2.8, k === 3 ? BONE : [140 + k * 20, 20, 16]);
  s.speckle(5, 5, 3, BLOOD_D, 6);
  s.finish([40, 4, 4]);
  return s;
}
function casing(red: boolean): Pix {
  const s = new Pix(red ? 7 : 5, red ? 4 : 3, 80);
  if (red) {
    s.rect(0, 0, 5, 4, [200, 34, 28]);
    s.rect(5, 0, 2, 4, [220, 180, 80]);
  } else s.rect(0, 0, 5, 3, [230, 190, 90]);
  return s;
}

// ------------------------------------------------------------------ registry + atlas

function buildFrames(): Map<string, { pix: Pix; anchor: 'bottom' | 'center' }> {
  const m = new Map<string, { pix: Pix; anchor: 'bottom' | 'center' }>();
  const add = (n: string, pix: Pix, anchor: 'bottom' | 'center' = 'bottom') => m.set(n, { pix, anchor });

  const zWalk: ZPose[] = [
    {},
    { bob: -1, lFoot: [26, 60], rFoot: [38, 62] },
    { bob: 0, lFoot: [28, 62], rFoot: [36, 62] },
    { bob: -1, lFoot: [26, 62], rFoot: [38, 60] },
  ];
  zWalk.forEach((p, i) => add(`zombieman_walk${i}`, zombie(p)));
  add('zombieman_idle', zombie({}));
  add('zombieman_atk0', zombie({ aim: true }));
  add('zombieman_atk1', zombie({ fire: true }));
  add('zombieman_pain', zombie({ pain: true }));
  const zl = zombie({ limp: true });
  deathFrames(zl, 64, 64, 14).forEach((f, i) => add(`zombieman_die${i}`, f));
  gibFrames(zl, 64, 64).forEach((f, i) => add(`zombieman_gib${i}`, f));

  const iWalk: IPose[] = [
    {},
    { bob: -1, lFoot: [24, 60], rFoot: [40, 62] },
    { lFoot: [26, 62], rFoot: [38, 62] },
    { bob: -1, lFoot: [24, 62], rFoot: [40, 60] },
  ];
  iWalk.forEach((p, i) => add(`imp_walk${i}`, imp(p)));
  add('imp_idle', imp({}));
  add('imp_atk0', imp({ cast: true }));
  add('imp_atk1', imp({ throw: true }));
  add('imp_claw', imp({ claw: true }));
  add('imp_pain', imp({ pain: true }));
  const il = imp({ limp: true });
  deathFrames(il, 64, 64, 15).forEach((f, i) => add(`imp_die${i}`, f));
  gibFrames(il, 64, 64).forEach((f, i) => add(`imp_gib${i}`, f));

  const pWalk: PPose[] = [
    {},
    { bob: -1, lFoot: [20, 52], rFoot: [52, 55], jaw: 0.35 },
    { lFoot: [23, 55], rFoot: [49, 55] },
    { bob: -1, lFoot: [20, 55], rFoot: [52, 52], jaw: 0.35 },
  ];
  pWalk.forEach((p, i) => add(`pinky_walk${i}`, pinky(p)));
  add('pinky_idle', pinky({}));
  add('pinky_atk0', pinky({ jaw: 1 }));
  add('pinky_atk1', pinky({ jaw: 0 }));
  add('pinky_pain', pinky({ pain: true, jaw: 0.7 }));
  const pl = pinky({ jaw: 0.6 });
  deathFrames(pl, 72, 56, 20).forEach((f, i) => add(`pinky_die${i}`, f));
  gibFrames(pl, 72, 56).forEach((f, i) => add(`pinky_gib${i}`, f));

  add('healthSmall', healthSmall());
  add('healthLarge', healthLarge());
  add('armor', armorVest());
  add('bulletClip', bulletClip());
  add('bulletBox', bulletBox());
  add('shells', shells());
  add('shellBox', shells(0, true));
  add('keyRed', keycard([255, 40, 30]));
  add('keyBlue', keycard([40, 110, 255]));
  add('keyYellow', keycard([255, 210, 40]));
  add('shotgun', shotgunPickup());
  add('chainsword', chainswordPickup());
  add('barrel', barrel());
  add('lamp', lamp());
  add('techColumn', techColumn());
  for (let k = 0; k < 2; k++) add(`fireball${k}`, fireball(k), 'center');
  for (let k = 0; k < 3; k++) add(`fireImpact${k}`, fireImpact(k), 'center');
  for (let k = 0; k < 4; k++) add(`telefog${k}`, teleFog(k));
  for (let k = 0; k < 4; k++) add(`chunk${k}`, chunk(k), 'center');
  add('casing', casing(false), 'center');
  add('shellCasing', casing(true), 'center');

  // ---- Chapter 2 / 3 monsters
  const walkPoses = (w: number, h: number): Pose[] => {
    const cx = w / 2, sp = w * 0.11, g = h - 1;
    return [
      {},
      { bob: -1, lFoot: [cx - sp - 2, g - 2], rFoot: [cx + sp + 2, g] },
      { lFoot: [cx - sp + 1, g], rFoot: [cx + sp - 1, g] },
      { bob: -1, lFoot: [cx - sp - 2, g], rFoot: [cx + sp + 2, g - 2] },
    ];
  };
  const monster = (name: string, fn: (p: Pose) => Pix, w: number, h: number, poolR: number, walk?: Pose[]) => {
    (walk ?? walkPoses(w, h)).forEach((p, i) => add(name + '_walk' + i, fn(p)));
    add(name + '_idle', fn({}));
    add(name + '_atk0', fn({ atk: 1 }));
    add(name + '_atk1', fn({ atk: 2 }));
    add(name + '_cast', fn({ cast: true }));
    add(name + '_pain', fn({ pain: true }));
    const limp = fn({ limp: true });
    deathFrames(limp, w, h, poolR).forEach((f, i) => add(name + '_die' + i, f));
    gibFrames(limp, w, h).forEach((f, i) => add(name + '_gib' + i, f));
  };
  monster('ironclad', ironclad, 72, 72, 18);
  monster('warden', warden, 112, 112, 30);
  monster('executioner', executioner, 80, 84, 20);
  add('core_idle', breachCore(0));
  add('core_walk0', breachCore(0));
  add('core_walk1', breachCore(1));
  add('core_walk2', breachCore(0));
  add('core_walk3', breachCore(1));
  add('core_atk0', breachCore(1, true));
  add('core_atk1', breachCore(1, true));
  add('core_cast', breachCore(1, true));
  add('core_pain', breachCore(1));
  for (let k = 0; k < 5; k++) add('core_die' + k, breachCore(0, false, k));
  for (let k = 0; k < 4; k++) add('core_gib' + k, breachCore(0, false, k + 1));
  for (let k = 0; k < 2; k++) add('bolt' + k, hellbolt(k), 'center');
  // ---- Chapter 4 / 5
  monster('wraith', wraith, 56, 76, 14);
  monster('sovereign', sovereign, 128, 128, 34);
  monster('warhound', warhound, 112, 80, 26);
  // ---- Siege: heretic host
  monster('boltgunner', (p) => hereticMarine('boltgunner', p), 76, 86, 18);
  monster('hellflamer', (p) => hereticMarine('hellflamer', p), 76, 86, 18);
  monster('terminator', (p) => hereticMarine('terminator', p), 100, 104, 24);
  monster('sorcerer', sorcerer, 84, 100, 20);
  // ---- late war: flyer, shield brute, final boss
  monster('harrier', harrier, 80, 64, 14, [{ bob: 0 }, { bob: 1 }, { bob: 2 }, { bob: 3 }]);
  monster('bulwark', bulwark, 92, 96, 22);
  monster('archon', archon, 136, 140, 36);
  for (let k = 0; k < 2; k++) add('acid' + k, acidOrb(k), 'center');
  for (let k = 0; k < 2; k++) add('sigil' + k, sigilRing(k), 'center');
  for (let k = 0; k < 2; k++) add('hbolt' + k, heresyBolt(k), 'center');
  for (let k = 0; k < 2; k++) add('orb' + k, soulOrb(k), 'center');
  for (let k = 0; k < 2; k++) add('shield' + k, hellShield(k), 'center');
  for (let k = 0; k < 2; k++) add('flame' + k, flameJet(k), 'center');
  add('beamRed', beamSeg(true), 'center');
  add('beam', beamSeg(false), 'center');
  add('bolter', bolterPickup());
  add('flamer', flamerPickup());
  add('bolts', boltsBox());
  add('fuel', fuelCan());
  for (let k = 0; k < 2; k++) add('jumpRing' + k, jumpRing(k), 'center');
  add('chainLink', chainLink(), 'center');
  for (let k = 0; k < 2; k++) add('shard' + k, boneShard(k), 'center');
  for (let k = 0; k < 3; k++) add('erupt' + k, eruptionMark(k), 'center');
  add('sniper', sniperPickup());
  add('rounds', roundsBox());
  add('grenades', grenadePickup());
  add('grenade0', grenadeSprite(false), 'center');
  add('grenade1', grenadeSprite(true), 'center');
  add('launcher', launcherPickup());
  add('rockets', rocketsBox());
  for (let k = 0; k < 2; k++) add('rocket' + k, rocketSprite(k), 'center');
  return m;
}

export function buildSpriteAtlas(): void {
  if (atlasData) return;
  const frames = buildFrames();
  const data = new Uint8Array(ATLAS * ATLAS * 4);
  let x = 1, y = 1, rowH = 0;
  for (const [name, { pix, anchor }] of frames) {
    if (x + pix.w + 1 > ATLAS) {
      x = 1;
      y += rowH + 2;
      rowH = 0;
    }
    if (y + pix.h + 1 > ATLAS) throw new Error('sprite atlas overflow at ' + name);
    for (let j = 0; j < pix.h; j++)
      for (let i = 0; i < pix.w; i++) {
        const s = (j * pix.w + i) * 4;
        const d = ((y + j) * ATLAS + x + i) * 4;
        data[d] = pix.data[s];
        data[d + 1] = pix.data[s + 1];
        data[d + 2] = pix.data[s + 2];
        data[d + 3] = pix.data[s + 3];
      }
    SPRITES[name] = {
      u0: x / ATLAS, v0: y / ATLAS, u1: (x + pix.w) / ATLAS, v1: (y + pix.h) / ATLAS,
      w: pix.w / PPU, h: pix.h / PPU, anchor,
    };
    x += pix.w + 2;
    rowH = Math.max(rowH, pix.h);
  }
  atlasData = data;
  atlasFill = (y + rowH) / ATLAS;
}

/** Fraction of the atlas height in use (debug). */
export let atlasFill = 0;

export function getSpriteTexture(scene: Scene): RawTexture {
  buildSpriteAtlas();
  const t = RawTexture.CreateRGBATexture(atlasData!, ATLAS, ATLAS, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
  t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
  t.hasAlpha = true;
  return t;
}

/** Individual frame as a canvas (used by UI previews). */
export function spriteCanvas(name: string, scale: number): HTMLCanvasElement | null {
  const f = buildFrames().get(name);
  return f ? f.pix.toCanvas(scale) : null;
}
