import { Pix, glow, type RGBA } from './pixart';

// Original pixel art for the Chapter 2 / 3 monsters: Ironclad, Warden (boss), Executioner, Breach Core.

const BONE: RGBA = [222, 208, 178];
const BLOOD: RGBA = [128, 8, 6];

export interface Pose {
  bob?: number;
  lFoot?: [number, number];
  rFoot?: [number, number];
  /** 0 idle, 1 raised wind-up, 2 strike/release */
  atk?: 0 | 1 | 2;
  cast?: boolean;
  pain?: boolean;
  limp?: boolean;
}

// ------------------------------------------------------------------ Ironclad: marine husk with welded plating

export function ironclad(p: Pose): Pix {
  const s = new Pix(72, 72, 21);
  const b = p.bob ?? 0;
  const PLATE: RGBA = [104, 112, 124], PLATE_D: RGBA = [62, 66, 76], RUSTC: RGBA = [120, 70, 40], SKIN: RGBA = [150, 120, 110];
  const lf = p.lFoot ?? [28, 71], rf = p.rFoot ?? [44, 71];
  s.limb(31, 46 + b, lf[0], lf[1] - 3, 5, 4.5, PLATE_D);
  s.limb(41, 46 + b, rf[0], rf[1] - 3, 5, 4.5, PLATE_D);
  for (const f of [lf, rf]) s.ell(f[0], f[1] - 2, 5.5, 2.6, [40, 42, 48]);
  const ty = p.pain ? -2 : 0;
  // torso plates
  s.ell(36, 36 + b + ty, 14, 14, PLATE);
  s.rect(25, 30 + b + ty, 22, 3, PLATE_D);
  s.rect(25, 38 + b + ty, 22, 3, PLATE_D);
  for (let x = 26; x < 47; x += 5) s.set(x, 31 + b + ty, [190, 196, 206]);
  s.speckle(36, 36 + b, 12, RUSTC, 30);
  // pauldrons
  s.ell(21, 26 + b + ty, 7, 6, PLATE);
  s.ell(51, 26 + b + ty, 7, 6, PLATE);
  // helmet with visor slit
  const hy = (p.pain ? 13 : 16) + b + ty;
  s.ell(36, hy, 7.5, 8, PLATE_D);
  s.rect(30, hy - 1, 13, 3, [20, 10, 10]);
  s.rect(31, hy, 11, 1, glow(255, 40, 20, 1));
  s.ell(36, hy + 6, 4, 2, SKIN);
  const club = (hx: number, hy2: number, tx: number, ty2: number) => {
    s.limb(hx, hy2, tx, ty2, 2.6, 2.6, [60, 56, 52]);
    s.ell(tx, ty2, 6, 6, PLATE_D);
    s.rect(tx - 5, ty2 - 1, 10, 2, [150, 150, 160]);
  };
  if (p.atk === 1) {
    s.limb(51, 26 + b, 56, 12 + b, 4, 3.5, PLATE);
    club(56, 12 + b, 58, 2 + b);
    s.limb(21, 26 + b, 18, 40 + b, 4, 3.5, PLATE);
  } else if (p.atk === 2) {
    s.limb(51, 26 + b, 44, 44 + b, 4, 3.5, PLATE);
    club(44, 44 + b, 36, 60 + b);
    s.limb(21, 26 + b, 18, 42 + b, 4, 3.5, PLATE);
    for (let k = 0; k < 5; k++) s.line(36 + (k - 2) * 6, 66, 36 + (k - 2) * 9, 70, [255, 200, 120, 200]);
  } else if (p.limp) {
    s.limb(21, 26 + b, 19, 46 + b, 4, 3.5, PLATE);
    s.limb(51, 26 + b, 53, 46 + b, 4, 3.5, PLATE);
  } else {
    s.limb(21, 26 + b, 17, 44 + b, 4, 3.5, PLATE);
    s.limb(51, 26 + b, 56, 40 + b, 4, 3.5, PLATE);
    club(56, 40 + b, 60, 54 + b);
  }
  if (p.pain) s.speckle(36, 34 + b, 10, [255, 220, 120], 30);
  s.finish([14, 14, 18]);
  return s;
}

// ------------------------------------------------------------------ Warden: forge-armored boss demon

export function warden(p: Pose): Pix {
  const s = new Pix(112, 112, 31);
  const b = p.bob ?? 0;
  const HIDE: RGBA = [96, 40, 34], HIDE_D: RGBA = [62, 24, 22], IRON: RGBA = [70, 66, 70], HORN: RGBA = [210, 196, 170];
  const lf = p.lFoot ?? [40, 111], rf = p.rFoot ?? [72, 111];
  s.limb(46, 72 + b, lf[0], lf[1] - 4, 9, 7, HIDE_D);
  s.limb(66, 72 + b, rf[0], rf[1] - 4, 9, 7, HIDE_D);
  for (const f of [lf, rf]) {
    s.ell(f[0], f[1] - 3, 9, 4, IRON);
    for (let k = -1; k <= 1; k++) s.set(f[0] + k * 5, f[1] - 1, HORN);
  }
  const ty = p.pain ? -3 : 0;
  // torso with molten core
  s.ell(56, 56 + b + ty, 26, 24, HIDE);
  s.ell(56, 62 + b + ty, 18, 16, IRON);
  for (let k = 0; k < 4; k++) s.rect(40, 52 + k * 6 + b + ty, 32, 2, [40, 38, 42]);
  const core = p.cast || p.atk === 1 ? 1 : 0.7;
  s.ell(56, 60 + b + ty, 7, 7, glow(255, 120, 30, core), 0);
  s.ell(56, 60 + b + ty, 4, 4, glow(255, 230, 140, 1), 0);
  // shoulders + spikes
  for (const sx of [-1, 1]) {
    const x = 56 + sx * 24;
    s.ell(x, 38 + b + ty, 11, 9, IRON);
    s.poly([[x - 3, 32 + b + ty], [x + 3, 32 + b + ty], [x + sx * 8, 16 + b + ty]], HORN);
  }
  // head
  const hy = (p.pain ? 24 : 28) + b + ty;
  s.ell(56, hy, 11, 10, HIDE);
  s.poly([[48, hy - 5], [36, hy - 22], [52, hy - 9]], HORN);
  s.poly([[64, hy - 5], [76, hy - 22], [60, hy - 9]], HORN);
  s.rect(48, hy - 2, 5, 3, glow(255, 200, 40));
  s.rect(59, hy - 2, 5, 3, glow(255, 200, 40));
  s.rect(50, hy + 5, 12, p.cast || p.atk ? 4 : 2, [40, 6, 6]);
  for (let i = 50; i < 62; i += 2) s.set(i, hy + 5, HORN);
  const arm = (sx: number, ex: number, ey: number, hx: number, hy2: number, fist = true) => {
    s.limb(56 + sx * 24, 40 + b + ty, ex, ey, 7, 6, HIDE);
    s.limb(ex, ey, hx, hy2, 6, 5.5, HIDE_D);
    if (fist) s.ell(hx, hy2, 7, 7, IRON);
  };
  if (p.cast) {
    arm(-1, 22, 22 + b, 26, 8 + b);
    arm(1, 90, 22 + b, 86, 8 + b);
    s.ell(56, 8 + b, 12, 8, glow(255, 110, 20, 0.9), 0);
    s.ell(56, 8 + b, 6, 4, glow(255, 230, 140, 1), 0);
  } else if (p.atk === 1) {
    arm(-1, 26, 14 + b, 40, 4 + b);
    arm(1, 86, 14 + b, 72, 4 + b);
  } else if (p.atk === 2) {
    arm(-1, 30, 76 + b, 42, 100 + b);
    arm(1, 82, 76 + b, 70, 100 + b);
    for (let k = 0; k < 9; k++) s.line(56 + (k - 4) * 6, 104, 56 + (k - 4) * 12, 111, glow(255, 160, 60, 0.9));
  } else if (p.limp) {
    arm(-1, 28, 70 + b, 30, 90 + b);
    arm(1, 84, 70 + b, 82, 90 + b);
  } else {
    arm(-1, 24, 64 + b, 28, 84 + b);
    arm(1, 88, 64 + b, 84, 84 + b);
  }
  if (p.pain) s.speckle(56, 50 + b, 20, BLOOD, 80);
  s.finish([22, 6, 4]);
  return s;
}

// ------------------------------------------------------------------ Executioner: hooded giant with a cleaver

export function executioner(p: Pose): Pix {
  const s = new Pix(80, 84, 41);
  const b = p.bob ?? 0;
  const ROBE: RGBA = [40, 30, 34], ROBE_D: RGBA = [26, 18, 22], SKIN: RGBA = [150, 128, 118], STEEL: RGBA = [170, 172, 180];
  const lf = p.lFoot ?? [33, 83], rf = p.rFoot ?? [47, 83];
  s.limb(36, 56 + b, lf[0], lf[1] - 3, 4.5, 4, ROBE_D);
  s.limb(44, 56 + b, rf[0], rf[1] - 3, 4.5, 4, ROBE_D);
  for (const f of [lf, rf]) s.ell(f[0], f[1] - 2, 4.5, 2.2, [30, 20, 18]);
  const ty = p.pain ? -2 : 0;
  // robe torso
  s.poly([[26, 30 + b + ty], [54, 30 + b + ty], [58, 64 + b], [22, 64 + b]], ROBE);
  s.rect(28, 44 + b + ty, 24, 3, [70, 20, 18]);
  s.speckle(40, 50 + b, 12, BLOOD, 30);
  // hood + face
  const hy = (p.pain ? 18 : 21) + b + ty;
  s.ell(40, hy, 9, 10, ROBE_D);
  s.ell(40, hy + 2, 5, 6, [14, 8, 10]);
  const eye = p.atk === 1 || p.cast ? glow(255, 40, 20, 1) : glow(255, 120, 40, 0.8);
  s.set(38, hy + 1, eye);
  s.set(42, hy + 1, eye);
  const blade = (hx: number, hy2: number, tx: number, ty2: number, hot: boolean) => {
    s.limb(hx, hy2, tx, ty2, 1.6, 1.6, [70, 50, 40]);
    const dx = tx - hx, dy = ty2 - hy2, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    s.poly([[tx, ty2], [tx + nx * 10, ty2 + ny * 10], [tx + nx * 10 + dx / l * 14, ty2 + ny * 10 + dy / l * 14], [tx + dx / l * 14, ty2 + dy / l * 14]], hot ? glow(255, 70, 30, 0.8) : STEEL);
  };
  if (p.atk === 1) {
    s.limb(28, 32 + b, 30, 12 + b, 3.5, 3, SKIN);
    s.limb(52, 32 + b, 48, 12 + b, 3.5, 3, SKIN);
    blade(39, 10 + b, 40, 0 + b, true);
  } else if (p.atk === 2) {
    s.limb(28, 32 + b, 36, 56 + b, 3.5, 3, SKIN);
    s.limb(52, 32 + b, 44, 56 + b, 3.5, 3, SKIN);
    blade(40, 58 + b, 40, 70 + b, false);
    for (let k = 0; k < 7; k++) s.line(40 + (k - 3) * 6, 80, 40 + (k - 3) * 10, 84, [255, 210, 140, 200]);
  } else if (p.cast) {
    s.limb(52, 32 + b, 62, 22 + b, 3.5, 3, SKIN);
    s.ell(64, 20 + b, 6, 6, glow(190, 60, 255, 1), 0);
    s.ell(64, 20 + b, 3, 3, glow(255, 220, 255, 1), 0);
    s.limb(28, 32 + b, 22, 52 + b, 3.5, 3, SKIN);
    blade(22, 52 + b, 18, 62 + b, false);
  } else if (p.limp) {
    s.limb(28, 32 + b, 26, 54 + b, 3.5, 3, SKIN);
    s.limb(52, 32 + b, 54, 54 + b, 3.5, 3, SKIN);
  } else {
    s.limb(28, 32 + b, 24, 52 + b, 3.5, 3, SKIN);
    s.limb(52, 32 + b, 58, 48 + b, 3.5, 3, SKIN);
    blade(58, 48 + b, 64, 62 + b, false);
  }
  if (p.pain) s.speckle(40, 40 + b, 10, BLOOD, 40);
  s.finish([10, 4, 6]);
  return s;
}

// ------------------------------------------------------------------ Breach Core: pulsing heart of the rift

export function breachCore(phase: number, charge = false, broken = 0): Pix {
  const s = new Pix(96, 112, 51 + phase);
  const FLESH: RGBA = [140, 34, 44], FLESH_D: RGBA = [90, 18, 26];
  const scale = 1 - broken * 0.18;
  const cy = 64 + broken * 8;
  // roots
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI + 0.2;
    s.limb(48, cy + 20, 48 + Math.cos(a) * 44 * scale, 110, 4, 2, FLESH_D);
  }
  s.ell(48, cy, 30 * scale, 38 * scale, FLESH);
  s.ell(48, cy + 6, 22 * scale, 26 * scale, FLESH_D);
  // veins
  for (let k = 0; k < 6; k++) {
    let x = 48, y = cy - 30 * scale;
    for (let i = 0; i < 50 * scale; i++) {
      s.set(x, y, glow(255, 90, 40, 0.5));
      y += 1;
      x += s.rand() < 0.5 ? -1 : 1;
      if (k % 2) x += 0.5;
    }
  }
  const r = (phase ? 13 : 10) * scale + (charge ? 4 : 0);
  if (broken < 4) {
    s.ell(48, cy, r, r, glow(255, charge ? 220 : 120, charge ? 255 : 40, 1), 0);
    s.ell(48, cy, r * 0.5, r * 0.5, glow(255, 255, 220, 1), 0);
  }
  // crystal shards
  for (const [x, y, h] of [[24, 30, 18], [70, 26, 22], [48, 14, 26], [34, 92, 12], [64, 94, 14]] as const) {
    if (broken >= 3 && y < 60) continue;
    s.poly([[x - 4, y + h * scale], [x + 4, y + h * scale], [x, y + broken * 6]], glow(200, 80, 255, 0.6));
  }
  if (broken) s.speckle(48, cy, 36, BLOOD, 60 * broken, false);
  s.finish([20, 4, 8]);
  return s;
}

export function hellbolt(k: number): Pix {
  const s = new Pix(22, 22, 70 + k);
  s.ell(11, 11, 9 + k, 8, glow(160, 40, 255, 0.8), 0);
  s.ell(11, 11, 6, 6, glow(220, 120, 255, 1), 0);
  s.ell(10.5, 10.5, 3, 3, glow(255, 240, 255, 1), 0);
  for (let i = 0; i < 10; i++) s.set(2 + s.rand() * 18, 2 + s.rand() * 18, glow(230, 160, 255, 1));
  return s;
}

export { BONE };
