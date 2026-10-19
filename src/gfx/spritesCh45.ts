import { Pix, glow, type RGBA } from './pixart';
import type { Pose } from './spritesCh23';

// Original pixel art for the Chapter 4 / 5 monsters: the Wraith and the Sovereign (final boss).

const BONE: RGBA = [226, 214, 186];

// ------------------------------------------------------------------ Wraith: gaunt cloaked skirmisher with a bone mask

export function wraith(p: Pose): Pix {
  const s = new Pix(56, 76, 41);
  const b = p.bob ?? 0;
  const CLOTH: RGBA = [52, 44, 58], CLOTH_D: RGBA = [30, 24, 36], SKIN: RGBA = [120, 104, 112];
  const lf = p.lFoot ?? [23, 75], rf = p.rFoot ?? [33, 75];
  // spindly legs under the ragged hem
  s.limb(26, 52 + b, lf[0], lf[1] - 2, 2.2, 1.8, SKIN);
  s.limb(30, 52 + b, rf[0], rf[1] - 2, 2.2, 1.8, SKIN);
  for (const f of [lf, rf]) s.ell(f[0], f[1] - 1, 3, 1.5, [70, 60, 66]);
  const ty = p.pain ? -2 : 0;
  // cloak: tapered body with tattered hem
  s.poly([[18, 22 + b + ty], [38, 22 + b + ty], [44, 56 + b], [12, 56 + b]], CLOTH);
  for (let x = 12; x < 44; x += 4) s.poly([[x, 55 + b], [x + 4, 55 + b], [x + 2, 60 + b + ((x / 4) % 2) * 3]], CLOTH_D);
  s.speckle(28, 40 + b, 12, CLOTH_D, 40);
  // spine ridge glow
  for (let y = 26; y < 50; y += 4) s.set(28, y + b + ty, glow(120, 255, 200, 0.6));
  // hood + bone mask
  const hy = (p.pain ? 13 : 16) + b + ty;
  s.ell(28, hy, 9, 10, CLOTH_D);
  s.ell(28, hy + 2, 6, 7, BONE);
  s.rect(24, hy, 3, 2, glow(120, 255, 210, 1));
  s.rect(30, hy, 3, 2, glow(120, 255, 210, 1));
  for (let i = 25; i < 32; i += 2) s.set(i, hy + 6, [60, 40, 40]);
  // long clawed arms
  const arm = (sx: number, hx: number, hy2: number) => {
    s.limb(28 + sx * 9, 26 + b + ty, hx, hy2, 2.6, 2, SKIN);
    for (let k = -1; k <= 1; k++) s.line(hx, hy2, hx + sx * 3 + k * 2, hy2 + 5, BONE);
  };
  if (p.atk === 1 || p.cast) {
    arm(-1, 12, 8 + b);
    arm(1, 44, 8 + b);
    if (p.cast) {
      s.ell(28, 6 + b, 7, 5, glow(160, 255, 220, 0.85), 0);
      for (let k = 0; k < 3; k++) s.rect(24 + k * 4, 3 + b, 1, 6, glow(240, 240, 220, 1));
    }
  } else if (p.atk === 2) {
    arm(-1, 14, 40 + b);
    arm(1, 48, 30 + b);
    s.line(30, 30 + b, 54, 26 + b, glow(160, 255, 220, 0.8));
  } else if (p.limp) {
    arm(-1, 16, 48 + b);
    arm(1, 40, 48 + b);
  } else {
    arm(-1, 12, 42 + b);
    arm(1, 44, 42 + b);
  }
  if (p.pain) s.speckle(28, 30 + b, 8, [255, 255, 255], 20);
  s.finish([10, 8, 14]);
  return s;
}

// ------------------------------------------------------------------ Sovereign: crowned demon lord on cloven legs

export function sovereign(p: Pose): Pix {
  const s = new Pix(128, 128, 53);
  const b = p.bob ?? 0;
  const HIDE: RGBA = [70, 22, 30], HIDE_D: RGBA = [42, 12, 20], GOLD: RGBA = [214, 170, 70], GOLD_D: RGBA = [140, 100, 36], ROBE: RGBA = [36, 18, 30];
  const lf = p.lFoot ?? [48, 127], rf = p.rFoot ?? [80, 127];
  s.limb(54, 84 + b, lf[0], lf[1] - 5, 9, 6, HIDE_D);
  s.limb(74, 84 + b, rf[0], rf[1] - 5, 9, 6, HIDE_D);
  for (const f of [lf, rf]) s.ell(f[0], f[1] - 3, 8, 4, [30, 20, 20]);
  const ty = p.pain ? -3 : 0;
  // robe skirt
  s.poly([[40, 70 + b + ty], [88, 70 + b + ty], [98, 104 + b], [30, 104 + b]], ROBE);
  for (let x = 32; x < 98; x += 6) s.rect(x, 100 + b, 3, 4, GOLD_D);
  // torso
  s.ell(64, 60 + b + ty, 24, 22, HIDE);
  s.speckle(64, 60 + b + ty, 18, HIDE_D, 60);
  // ribcage of gold
  for (let k = 0; k < 4; k++) s.rect(48, 52 + k * 6 + b + ty, 32, 2, GOLD_D);
  const heart = p.cast || p.atk === 1 ? 1 : 0.7;
  s.ell(64, 58 + b + ty, 6, 7, glow(255, 60, 90, heart), 0);
  s.ell(64, 58 + b + ty, 3, 3, glow(255, 220, 230, 1), 0);
  // shoulders: gold pauldrons with spikes
  for (const sx of [-1, 1]) {
    const x = 64 + sx * 26;
    s.ell(x, 42 + b + ty, 12, 8, GOLD);
    s.ell(x, 44 + b + ty, 9, 5, GOLD_D);
    for (let k = 0; k < 3; k++) s.poly([[x - 4 + k * 4, 36 + b + ty], [x - 2 + k * 4, 36 + b + ty], [x - 3 + k * 4 + sx * 3, 24 + b + ty]], BONE);
  }
  // head + crown
  const hy = (p.pain ? 26 : 30) + b + ty;
  s.ell(64, hy, 12, 12, HIDE);
  s.rect(55, hy - 2, 6, 3, glow(255, 80, 60, 1));
  s.rect(67, hy - 2, 6, 3, glow(255, 80, 60, 1));
  s.rect(57, hy + 6, 14, p.cast || p.atk ? 4 : 2, [20, 4, 6]);
  for (let i = 57; i < 71; i += 2) s.set(i, hy + 6, BONE);
  s.rect(52, hy - 14, 24, 5, GOLD);
  for (let k = 0; k < 5; k++) s.poly([[52 + k * 5, hy - 14], [56 + k * 5, hy - 14], [54 + k * 5, hy - 24 - (k === 2 ? 6 : 0)]], GOLD);
  s.set(64, hy - 12, glow(255, 60, 90, 1));
  // horns sweeping back
  s.poly([[52, hy - 6], [36, hy - 20], [40, hy - 10]], BONE);
  s.poly([[76, hy - 6], [92, hy - 20], [88, hy - 10]], BONE);
  const arm = (sx: number, ex: number, ey: number, hx: number, hy2: number) => {
    s.limb(64 + sx * 26, 44 + b + ty, ex, ey, 7, 6, HIDE);
    s.limb(ex, ey, hx, hy2, 6, 5, HIDE_D);
    for (let k = -1; k <= 1; k++) s.line(hx, hy2, hx + sx * 4 + k * 3, hy2 + 7, BONE);
  };
  if (p.cast) {
    arm(-1, 24, 30 + b, 22, 12 + b);
    arm(1, 104, 30 + b, 106, 12 + b);
    s.ell(22, 10 + b, 8, 8, glow(255, 60, 120, 0.9), 0);
    s.ell(106, 10 + b, 8, 8, glow(255, 60, 120, 0.9), 0);
  } else if (p.atk === 1) {
    arm(-1, 30, 20 + b, 48, 6 + b);
    arm(1, 98, 20 + b, 80, 6 + b);
    s.ell(64, 4 + b, 14, 6, glow(255, 120, 40, 0.9), 0);
  } else if (p.atk === 2) {
    arm(-1, 34, 74 + b, 40, 100 + b);
    arm(1, 94, 74 + b, 88, 100 + b);
    for (let k = 0; k < 7; k++) s.line(64 + (k - 3) * 9, 118, 64 + (k - 3) * 13, 126, glow(255, 160, 60, 0.9));
  } else if (p.limp) {
    arm(-1, 38, 70 + b, 40, 92 + b);
    arm(1, 90, 70 + b, 88, 92 + b);
  } else {
    arm(-1, 32, 62 + b, 28, 82 + b);
    arm(1, 96, 62 + b, 100, 82 + b);
  }
  if (p.pain) s.speckle(64, 56 + b, 16, [255, 230, 200], 50);
  s.finish([12, 6, 10]);
  return s;
}

export function boneShard(k: number): Pix {
  const s = new Pix(16, 16, 80 + k);
  const a = k * 0.8;
  const dx = Math.cos(a) * 6, dy = Math.sin(a) * 6;
  s.ell(8, 8, 6, 6, glow(140, 255, 210, 0.45), 0);
  s.line(8 - dx, 8 - dy, 8 + dx, 8 + dy, BONE);
  s.line(8 - dx + 1, 8 - dy, 8 + dx + 1, 8 + dy, [180, 170, 150]);
  s.set(8 + dx, 8 + dy, glow(220, 255, 240, 1));
  return s;
}

/** Ground eruption warning sigil, drawn flat-ish as a billboard. */
export function eruptionMark(k: number): Pix {
  const s = new Pix(40, 20, 90 + k);
  const a = 0.5 + k * 0.25;
  s.ell(20, 10, 18, 8, glow(255, 80, 20, a * 0.6), 0);
  s.ell(20, 10, 12, 5, glow(255, 160, 60, a), 0);
  s.ell(20, 10, 5, 2, glow(255, 240, 200, 1), 0);
  return s;
}
