import { Pix, glow, type RGBA } from './pixart';
import type { Pose } from './spritesCh23';

// Original pixel art for Siege mode's heretic host: three Heretic Marine variants (soulless power
// armor with spiked trim), the Sorcerer that commands them, and their projectiles and effects.

const BRASS: RGBA = [190, 150, 70];
const BONE: RGBA = [226, 214, 186];

export type HereticVariant = 'boltgunner' | 'hellflamer' | 'terminator';

interface Palette {
  armor: RGBA;
  dark: RGBA;
  trim: RGBA;
  eye: RGBA;
}

const PAL: Record<HereticVariant, Palette> = {
  boltgunner: { armor: [44, 58, 104], dark: [24, 30, 58], trim: BRASS, eye: glow(120, 200, 255, 1) },
  hellflamer: { armor: [46, 86, 58], dark: [24, 44, 30], trim: [170, 120, 60], eye: glow(120, 255, 170, 1) },
  terminator: { armor: [86, 26, 32], dark: [44, 12, 16], trim: BRASS, eye: glow(255, 60, 40, 1) },
};

/** Power-armored heretic. Terminators are drawn bigger and bulkier on a larger canvas. */
export function hereticMarine(variant: HereticVariant, p: Pose): Pix {
  const big = variant === 'terminator';
  const W = big ? 100 : 76, H = big ? 104 : 86;
  const s = new Pix(W, H, big ? 131 : variant === 'boltgunner' ? 121 : 125);
  const P = PAL[variant];
  const cx = W / 2;
  const b = p.bob ?? 0;
  const k = big ? 1.3 : 1; // scale factor for proportions
  const ty = p.pain ? -2 : 0;
  const lf = p.lFoot ?? [cx - 8 * k, H - 1], rf = p.rFoot ?? [cx + 8 * k, H - 1];
  // armored legs
  s.limb(cx - 6 * k, H * 0.6 + b, lf[0], lf[1] - 4, 6 * k, 5 * k, P.dark);
  s.limb(cx + 6 * k, H * 0.6 + b, rf[0], rf[1] - 4, 6 * k, 5 * k, P.dark);
  for (const f of [lf, rf]) s.ell(f[0], f[1] - 3, 7 * k, 3.5 * k, P.armor);
  // tabard of chains / skulls
  s.poly([[cx - 7 * k, H * 0.55 + b], [cx + 7 * k, H * 0.55 + b], [cx + 5 * k, H * 0.75 + b], [cx - 5 * k, H * 0.75 + b]], [70, 20, 20]);
  s.ell(cx, H * 0.66 + b, 2.6 * k, 2.6 * k, BONE);
  // torso + chest eagle-less heretic plate
  const chestY = H * 0.43 + b + ty;
  s.ell(cx, chestY, 15 * k, 14 * k, P.armor);
  s.rect(cx - 12 * k, chestY - 3, 24 * k, 2, P.trim);
  s.poly([[cx - 6 * k, chestY - 9 * k], [cx + 6 * k, chestY - 9 * k], [cx, chestY + 2]], P.dark);
  s.speckle(cx, chestY, 12 * k, P.dark, 40);
  // spiked pauldrons
  for (const sx of [-1, 1]) {
    const x = cx + sx * 17 * k;
    const y = H * 0.32 + b + ty;
    s.ell(x, y, 10 * k, 8 * k, P.armor);
    s.ell(x, y + 2, 10 * k, 3 * k, P.trim, 0.2);
    for (let i = 0; i < 3; i++) s.poly([[x - 5 * k + i * 5 * k, y - 6 * k], [x - 3 * k + i * 5 * k, y - 6 * k], [x - 4 * k + i * 5 * k, y - 14 * k]], BONE);
  }
  // helmet: grilled, horned
  const hy = H * 0.2 + b + ty + (p.pain ? -1 : 0);
  s.ell(cx, hy, 7.5 * k, 8 * k, P.armor);
  s.rect(cx - 5 * k, hy - 1, 3 * k, 2, P.eye);
  s.rect(cx + 2 * k, hy - 1, 3 * k, 2, P.eye);
  for (let i = -3; i <= 3; i += 2) s.set(cx + i * k, hy + 5 * k, P.dark);
  s.poly([[cx - 6 * k, hy - 4 * k], [cx - 12 * k, hy - 14 * k], [cx - 3 * k, hy - 7 * k]], BONE);
  s.poly([[cx + 6 * k, hy - 4 * k], [cx + 12 * k, hy - 14 * k], [cx + 3 * k, hy - 7 * k]], BONE);
  // backpack vents with soul-fire
  s.rect(cx - 13 * k, H * 0.24 + b, 4 * k, 6 * k, P.dark);
  s.rect(cx + 9 * k, H * 0.24 + b, 4 * k, 6 * k, P.dark);
  s.set(cx - 11 * k, H * 0.22 + b, P.eye);
  s.set(cx + 11 * k, H * 0.22 + b, P.eye);

  const armY = H * 0.36 + b + ty;
  if (variant === 'boltgunner') {
    // two-handed bolter held across the chest
    const aim = p.atk ? -4 : 0;
    s.limb(cx - 17, armY, cx - 6, armY + 12 + aim, 5, 4, P.armor);
    s.limb(cx + 17, armY, cx + 8, armY + 14 + aim, 5, 4, P.armor);
    s.rect(cx - 10, armY + 8 + aim, 22, 9, [50, 50, 56]);
    s.rect(cx + 10, armY + 10 + aim, 10, 5, [36, 36, 40]);
    s.rect(cx - 6, armY + 6 + aim, 8, 3, P.trim);
    if (p.atk === 2) {
      s.ell(cx + 22, armY + 12 + aim, 6, 5, glow(110, 180, 255, 0.95), 0);
      s.ell(cx + 22, armY + 12 + aim, 3, 2, glow(230, 245, 255, 1), 0);
    }
  } else if (variant === 'hellflamer') {
    // flamer with promethium tank on the back, nozzle forward
    s.ell(cx, armY + 4, 8, 10, [60, 70, 50]);
    s.limb(cx - 17, armY, cx - 6, armY + 14, 5, 4, P.armor);
    s.limb(cx + 17, armY, cx + 8, armY + 12, 5, 4, P.armor);
    s.rect(cx - 6, armY + 10, 20, 7, [56, 56, 60]);
    s.rect(cx + 12, armY + 11, 6, 4, P.trim);
    s.set(cx + 18, armY + 12, glow(120, 255, 200, 0.8));
    if (p.atk === 1) s.ell(cx + 18, armY + 13, 3, 3, glow(120, 255, 200, 0.9), 0);
    if (p.atk === 2) {
      for (let i = 0; i < 4; i++) s.ell(cx + 22 + i * 4, armY + 13 + (i % 2) * 2, 4 + i, 3 + i * 0.8, glow(i < 2 ? 120 : 80, 255, i < 2 ? 200 : 240, 0.85), 0);
    }
  } else {
    // terminator: storm cannon on the left, power sword on the right
    const swordUp = p.atk === 1;
    s.limb(cx - 22, armY, cx - 24, armY + 22, 8, 7, P.armor);
    s.rect(cx - 32, armY + 18, 16, 14, [52, 52, 58]);
    for (let i = 0; i < 3; i++) s.rect(cx - 31 + i * 5, armY + 32, 3, 6, [30, 30, 34]);
    if (p.cast) s.ell(cx - 24, armY + 40, 7, 6, glow(255, 160, 60, 0.9), 0);
    if (swordUp) {
      s.limb(cx + 22, armY, cx + 26, armY - 16, 8, 7, P.armor);
      s.line(cx + 26, armY - 18, cx + 30, armY - 60, glow(120, 190, 255, 1));
      s.line(cx + 27, armY - 18, cx + 31, armY - 60, glow(200, 230, 255, 1));
      s.line(cx + 28, armY - 18, cx + 32, armY - 60, glow(120, 190, 255, 1));
    } else if (p.atk === 2) {
      s.limb(cx + 22, armY, cx + 10, armY + 22, 8, 7, P.armor);
      s.line(cx + 10, armY + 24, cx - 30, armY + 40, glow(160, 210, 255, 1));
      s.line(cx + 10, armY + 25, cx - 30, armY + 41, glow(220, 240, 255, 1));
      for (let i = 0; i < 6; i++) s.set(cx - 30 + i * 7, armY + 44 + (i % 2), glow(160, 210, 255, 0.8));
    } else {
      s.limb(cx + 22, armY, cx + 26, armY + 22, 8, 7, P.armor);
      s.line(cx + 26, armY + 24, cx + 34, armY + 60, [170, 180, 200]);
      s.line(cx + 27, armY + 24, cx + 35, armY + 60, [210, 220, 236]);
    }
  }
  if (p.limp) s.speckle(cx, chestY, 10 * k, [120, 20, 20], 30);
  if (p.pain) s.speckle(cx, chestY, 10 * k, [255, 230, 200], 30);
  s.finish([10, 10, 14]);
  return s;
}

// ------------------------------------------------------------------ Sorcerer: heretic-armored human with a skull staff

export function sorcerer(p: Pose): Pix {
  const s = new Pix(84, 100, 141);
  const b = p.bob ?? 0;
  const ARM: RGBA = [64, 30, 78], ARM_D: RGBA = [34, 14, 44], ROBE: RGBA = [96, 14, 24], SKIN: RGBA = [190, 150, 130];
  const cx = 42;
  const ty = p.pain ? -2 : 0;
  const lf = p.lFoot ?? [36, 99], rf = p.rFoot ?? [48, 99];
  // robe skirt over greaves
  s.poly([[cx - 12, 54 + b + ty], [cx + 12, 54 + b + ty], [cx + 18, 92 + b], [cx - 18, 92 + b]], ROBE);
  for (let x = cx - 18; x < cx + 18; x += 4) s.rect(x, 90 + b, 2, 3, [60, 8, 14]);
  s.limb(cx - 5, 88 + b, lf[0], lf[1] - 3, 4, 3, ARM_D);
  s.limb(cx + 5, 88 + b, rf[0], rf[1] - 3, 4, 3, ARM_D);
  // armored torso with brass runes
  s.ell(cx, 44 + b + ty, 13, 13, ARM);
  s.rect(cx - 10, 40 + b + ty, 20, 2, BRASS);
  for (let i = 0; i < 5; i++) s.set(cx - 8 + i * 4, 48 + b + ty, glow(200, 90, 255, 0.9));
  // high-collared pauldrons
  for (const sx of [-1, 1]) {
    s.ell(cx + sx * 15, 34 + b + ty, 8, 7, ARM);
    s.poly([[cx + sx * 10, 30 + b + ty], [cx + sx * 20, 30 + b + ty], [cx + sx * 18, 16 + b + ty]], ARM_D);
  }
  // face (human, unhelmeted) + horned crown
  const hy = 24 + b + ty;
  s.ell(cx, hy, 6.5, 7.5, SKIN);
  s.rect(cx - 4, hy - 1, 3, 2, glow(220, 120, 255, 1));
  s.rect(cx + 1, hy - 1, 3, 2, glow(220, 120, 255, 1));
  s.rect(cx - 3, hy + 4, 6, p.cast || p.atk ? 2 : 1, [60, 20, 20]);
  s.rect(cx - 7, hy - 9, 14, 3, BRASS);
  for (let i = 0; i < 4; i++) s.poly([[cx - 7 + i * 4, hy - 9], [cx - 5 + i * 4, hy - 9], [cx - 6 + i * 4, hy - 17 - (i === 1 || i === 2 ? 4 : 0)]], BONE);
  // staff (right hand) + casting hand (left)
  const staff = (x0: number, y0: number, x1: number, y1: number) => {
    s.line(x0, y0, x1, y1, [70, 50, 40]);
    s.line(x0 + 1, y0, x1 + 1, y1, [100, 74, 54]);
    s.ell(x1, y1, 5, 5, BONE);
    s.ell(x1, y1, 2, 2, glow(220, 120, 255, 1), 0);
  };
  if (p.cast) {
    s.limb(cx - 15, 36 + b, cx - 26, 14 + b, 4, 3, ARM);
    s.ell(cx - 27, 10 + b, 8, 8, glow(220, 60, 120, 0.85), 0);
    s.ell(cx - 27, 10 + b, 4, 4, glow(255, 220, 240, 1), 0);
    s.limb(cx + 15, 36 + b, cx + 22, 44 + b, 4, 3, ARM);
    staff(cx + 24, 96 + b, cx + 26, 14 + b);
  } else if (p.atk === 1) {
    s.limb(cx + 15, 36 + b, cx + 20, 16 + b, 4, 3, ARM);
    s.limb(cx - 15, 36 + b, cx - 6, 20 + b, 4, 3, ARM);
    staff(cx + 26, 40 + b, cx - 6, 4 + b);
  } else if (p.atk === 2) {
    s.limb(cx + 15, 36 + b, cx + 4, 52 + b, 4, 3, ARM);
    staff(cx + 30, 30 + b, cx - 30, 70 + b);
    for (let i = 0; i < 5; i++) s.set(cx - 30 + i * 12, 74 + b, glow(220, 120, 255, 0.8));
  } else {
    s.limb(cx - 15, 36 + b, cx - 20, 56 + b, 4, 3, ARM);
    s.limb(cx + 15, 36 + b, cx + 22, 50 + b, 4, 3, ARM);
    staff(cx + 24, 98 + b, cx + 26, 12 + b);
  }
  if (p.pain) s.speckle(cx, 44 + b, 10, [255, 220, 255], 30);
  s.finish([10, 6, 14]);
  return s;
}

// ------------------------------------------------------------------ effects

export function heresyBolt(k: number): Pix {
  const s = new Pix(16, 16, 150 + k);
  s.ell(8, 8, 6 + k, 5, glow(80, 150, 255, 0.6), 0);
  s.ell(8, 8, 3, 3, glow(200, 230, 255, 1), 0);
  return s;
}

export function soulOrb(k: number): Pix {
  const s = new Pix(26, 26, 152 + k);
  s.ell(13, 13, 11, 11, glow(200, 40, 120, 0.45), 0);
  s.ell(13, 13, 7, 7, glow(240, 90, 200, 0.85), 0);
  s.ell(13 + (k ? 2 : -2), 12, 3, 3, glow(255, 230, 250, 1), 0);
  for (let i = 0; i < 6; i++) {
    const a = i + k * 0.5;
    s.set(13 + Math.cos(a) * 10, 13 + Math.sin(a) * 10, glow(255, 120, 220, 1));
  }
  return s;
}

/** Translucent hell-shield bubble (drawn around the Sorcerer). */
export function hellShield(k: number): Pix {
  const s = new Pix(64, 64, 160 + k);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x - 31.5, y - 31.5);
      if (d > 31) continue;
      const rim = Math.max(0, 1 - Math.abs(d - 29) / 3);
      const hex = (Math.floor(x / 6) + Math.floor(y / 6) + k) % 5 === 0 ? 0.25 : 0;
      const a = Math.min(1, rim * 0.9 + 0.12 + hex);
      s.set(x, y, glow(150, 60, 255, a));
    }
  return s;
}

export function beamSeg(red: boolean): Pix {
  const s = new Pix(12, 12, red ? 170 : 171);
  if (red) {
    s.ell(6, 6, 3, 3, glow(255, 40, 40, 0.75), 0);
  } else {
    s.ell(6, 6, 6, 6, glow(255, 90, 200, 0.7), 0);
    s.ell(6, 6, 3, 3, glow(255, 240, 250, 1), 0);
  }
  return s;
}

export function flameJet(k: number): Pix {
  const s = new Pix(20, 20, 180 + k);
  s.ell(10, 10, 8 + k, 7, glow(90, 255, 190, 0.55), 0);
  s.ell(10, 10, 4, 4, glow(200, 255, 240, 0.9), 0);
  return s;
}

// ------------------------------------------------------------------ captured heretic weapons (pickups)

export function bolterPickup(): Pix {
  const s = new Pix(56, 22, 190);
  s.rect(2, 6, 40, 10, [52, 52, 58]);
  s.rect(2, 8, 40, 2, [80, 80, 90]);
  s.rect(40, 8, 12, 6, [36, 36, 40]);
  s.rect(16, 16, 8, 6, [40, 40, 44]);
  s.rect(10, 4, 14, 3, BRASS);
  s.set(52, 11, glow(110, 180, 255, 1));
  s.finish();
  return s;
}

export function flamerPickup(): Pix {
  const s = new Pix(56, 24, 191);
  s.ell(14, 12, 9, 9, [60, 70, 50]);
  s.rect(18, 8, 30, 7, [56, 56, 60]);
  s.rect(46, 9, 8, 5, [170, 120, 60]);
  s.set(54, 11, glow(120, 255, 200, 1));
  s.finish();
  return s;
}

export function boltsBox(): Pix {
  const s = new Pix(22, 16, 192);
  s.rect(1, 6, 20, 9, [44, 58, 104]);
  s.rect(3, 9, 16, 3, BRASS);
  for (let x = 3; x < 19; x += 4) s.rect(x, 0, 2, 7, [150, 150, 160]);
  s.finish();
  return s;
}

export function fuelCan(): Pix {
  const s = new Pix(16, 20, 193);
  s.rect(2, 4, 12, 15, [46, 86, 58]);
  s.rect(5, 1, 6, 3, [40, 40, 44]);
  s.rect(4, 9, 8, 3, glow(120, 255, 200, 0.8));
  s.finish();
  return s;
}

export function jumpRing(k: number): Pix {
  const s = new Pix(48, 24, 200 + k);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x - 23.5) / 23, (y - 11.5) / 11);
      if (d > 1) continue;
      const ring = Math.max(0, 1 - Math.abs(d - (0.85 - k * 0.08)) / 0.1);
      const fill = d < 0.8 ? 0.18 : 0;
      if (ring + fill > 0.05) s.set(x, y, glow(255, 220, 60, Math.min(1, ring + fill)));
    }
  return s;
}

export function chainLink(): Pix {
  const s = new Pix(8, 8, 205);
  s.ell(4, 4, 3, 3, [150, 150, 160]);
  s.ell(4, 4, 1.5, 1.5, [40, 40, 44]);
  return s;
}
