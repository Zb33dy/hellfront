import { Pix, glow, type RGBA } from './pixart';
import type { Pose } from './spritesCh23';

// Original pixel art for the late-war monsters: the Harrier (winged carrion flyer), the Bulwark
// (tower-shield brute) and the Archon, the final boss of Chapter 6.

const BONE: RGBA = [226, 214, 186];

// ------------------------------------------------------------------ Harrier: skinless winged flyer

/** `bob` doubles as the wing phase (0..3). */
export function harrier(p: Pose): Pix {
  const s = new Pix(80, 64, 61);
  const SKIN: RGBA = [150, 80, 72], SKIN_D: RGBA = [96, 44, 42], MEMB: RGBA = [110, 40, 46], MEMB_D: RGBA = [70, 24, 30];
  const phase = Math.abs(Math.round(p.bob ?? 0)) % 4;
  const cx = 40;
  const ty = p.pain ? -2 : 0;
  const dive = p.atk === 2;
  // wings: angle by phase (up, mid, down, mid); folded back while diving
  const lift = dive ? -6 : [-22, -6, 10, -6][phase];
  for (const sx of [-1, 1]) {
    const sh: [number, number] = [cx + sx * 7, 22 + ty];
    const tip: [number, number] = [cx + sx * (dive ? 20 : 37), 20 + lift + ty];
    const elbow: [number, number] = [cx + sx * (dive ? 14 : 22), 14 + lift * 0.5 + ty];
    s.poly([sh, elbow, tip, [cx + sx * (dive ? 16 : 30), 36 + lift * 0.3 + ty], [cx + sx * 12, 38 + ty]], MEMB);
    // finger bones
    s.line(sh[0], sh[1], elbow[0], elbow[1], SKIN_D);
    s.line(elbow[0], elbow[1], tip[0], tip[1], BONE);
    s.line(elbow[0], elbow[1], cx + sx * (dive ? 16 : 30), 36 + lift * 0.3 + ty, SKIN_D);
    s.speckle(cx + sx * 20, 28 + lift * 0.4 + ty, 7, MEMB_D, 25);
  }
  // hanging legs with talons
  const legY = p.atk === 2 ? 50 : 46;
  for (const sx of [-1, 1]) {
    s.limb(cx + sx * 4, 36 + ty, cx + sx * 6, legY, 2.4, 1.6, SKIN_D);
    for (let k = -1; k <= 1; k++) s.line(cx + sx * 6, legY, cx + sx * 6 + k * 2, legY + 4, BONE);
  }
  // body: ribbed torso
  s.ell(cx, 30 + ty, 8, 11, SKIN);
  for (let y = 24; y < 38; y += 3) s.line(cx - 6, y + ty, cx + 6, y + ty, SKIN_D);
  // head: long jaw, glowing eyes
  const hy = 15 + ty;
  s.ell(cx, hy, 6, 6, SKIN);
  s.poly([[cx - 4, hy + 3], [cx + 4, hy + 3], [cx, hy + (p.cast || p.atk === 1 ? 14 : 10)]], SKIN_D);
  if (p.cast || p.atk === 1) for (let i = -2; i <= 2; i += 2) s.set(cx + i, hy + 6, BONE);
  s.rect(cx - 4, hy - 1, 2, 2, glow(255, 220, 60, 1));
  s.rect(cx + 2, hy - 1, 2, 2, glow(255, 220, 60, 1));
  s.poly([[cx - 5, hy - 4], [cx - 9, hy - 12], [cx - 2, hy - 6]], BONE);
  s.poly([[cx + 5, hy - 4], [cx + 9, hy - 12], [cx + 2, hy - 6]], BONE);
  if (p.cast) s.ell(cx, hy + 13, 4, 4, glow(170, 255, 80, 0.9), 0);
  if (p.limp) s.speckle(cx, 30, 8, [110, 20, 20], 30);
  if (p.pain) s.speckle(cx, 30, 8, [255, 230, 200], 30);
  s.finish([12, 6, 8]);
  return s;
}

export function acidOrb(k: number): Pix {
  const s = new Pix(18, 18, 62 + k);
  s.ell(9, 9, 7 + k, 6, glow(150, 255, 60, 0.55), 0);
  s.ell(9, 9, 3.5, 3.5, glow(230, 255, 170, 1), 0);
  return s;
}

// ------------------------------------------------------------------ Bulwark: brute behind a tower shield

export function bulwark(p: Pose): Pix {
  const W = 92, H = 96;
  const s = new Pix(W, H, 63);
  const SKIN: RGBA = [128, 96, 84], SKIN_D: RGBA = [86, 60, 54], IRON: RGBA = [92, 92, 100], IRON_D: RGBA = [54, 54, 62], RUST: RGBA = [124, 70, 40];
  const cx = W / 2;
  const b = p.bob ?? 0;
  const ty = p.pain ? -2 : 0;
  const lf = p.lFoot ?? [cx - 10, H - 1], rf = p.rFoot ?? [cx + 10, H - 1];
  // legs
  s.limb(cx - 8, 60 + b, lf[0], lf[1] - 4, 6, 5, SKIN_D);
  s.limb(cx + 8, 60 + b, rf[0], rf[1] - 4, 6, 5, SKIN_D);
  for (const f of [lf, rf]) s.ell(f[0], f[1] - 3, 7, 3.5, IRON_D);
  // hulking torso + head behind the shield
  s.ell(cx + 4, 46 + b + ty, 20, 18, SKIN);
  s.speckle(cx + 4, 46 + b + ty, 16, SKIN_D, 50);
  const hy = 22 + b + ty;
  s.ell(cx + 6, hy, 8, 8, SKIN);
  s.rect(cx, hy - 3, 13, 4, IRON); // visor band
  s.rect(cx + 2, hy - 2, 3, 2, glow(255, 140, 40, 1));
  s.rect(cx + 8, hy - 2, 3, 2, glow(255, 140, 40, 1));
  // right arm: javelin or free fist
  if (p.cast) {
    s.limb(cx + 20, 36 + b, cx + 30, 8 + b, 5, 4, SKIN);
    s.line(cx + 22, 30 + b, cx + 38, -2 + b, [120, 100, 80]);
    s.poly([[cx + 37, b - 6], [cx + 41, b - 6], [cx + 39, b + 4]], BONE);
  } else s.limb(cx + 20, 36 + b, cx + 26, 58 + b, 5, 4, SKIN);
  // tower shield (left arm), pushed forward during the bash
  const push = p.atk === 2 ? -6 : p.atk === 1 ? 3 : 0;
  const sx0 = cx - 34 + push, sy0 = 24 + b + ty + (p.atk === 2 ? -2 : 0);
  const SW = 40, SH = 58;
  s.rect(sx0, sy0, SW, SH, IRON);
  s.rect(sx0 + 2, sy0 + 2, SW - 4, SH - 4, IRON_D);
  s.rect(sx0 + 4, sy0 + 4, SW - 8, SH - 8, IRON);
  s.speckle(sx0 + SW / 2, sy0 + SH / 2, 16, RUST, 60);
  for (const [x, y] of [[4, 4], [SW - 5, 4], [4, SH - 5], [SW - 5, SH - 5], [SW / 2, 4], [SW / 2, SH - 5]]) s.set(sx0 + x, sy0 + y, BONE);
  // spiked boss + skull emblem
  s.ell(sx0 + SW / 2, sy0 + SH / 2 - 4, 7, 7, BONE);
  s.rect(sx0 + SW / 2 - 4, sy0 + SH / 2 - 6, 3, 3, [30, 20, 20]);
  s.rect(sx0 + SW / 2 + 1, sy0 + SH / 2 - 6, 3, 3, [30, 20, 20]);
  for (let i = 0; i < 3; i++) s.poly([[sx0 + 6 + i * 13, sy0], [sx0 + 10 + i * 13, sy0], [sx0 + 8 + i * 13, sy0 - 7]], BONE);
  if (p.atk === 1) for (let y = 0; y < SH; y += 3) s.set(sx0 - 1, sy0 + y, glow(120, 190, 255, 0.9));
  if (p.limp) s.speckle(cx + 4, 46, 14, [120, 20, 20], 40);
  if (p.pain) s.speckle(cx, 46, 14, [255, 230, 200], 40);
  s.finish([10, 8, 8]);
  return s;
}

// ------------------------------------------------------------------ Archon: the final boss (Chapter 6)

export function archon(p: Pose): Pix {
  const W = 136, H = 140;
  const s = new Pix(W, H, 64);
  const HIDE: RGBA = [70, 22, 30], HIDE_D: RGBA = [40, 10, 16], GOLD: RGBA = [200, 150, 60], EYE = glow(255, 240, 120, 1);
  const cx = W / 2;
  const b = p.bob ?? 0;
  const ty = p.pain ? -2 : 0;
  const lf = p.lFoot ?? [cx - 16, H - 1], rf = p.rFoot ?? [cx + 16, H - 1];
  // digitigrade legs
  for (const [f, sx] of [[lf, -1], [rf, 1]] as [[number, number], number][]) {
    s.limb(cx + sx * 12, 86 + b, cx + sx * 20, 110 + b, 9, 7, HIDE_D);
    s.limb(cx + sx * 20, 110 + b, f[0], f[1] - 4, 7, 5, HIDE_D);
    for (let k = -1; k <= 1; k++) s.line(f[0], f[1] - 3, f[0] + k * 4, f[1], BONE);
  }
  // halo of blades behind the head
  const hy = 26 + b + ty;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    s.poly([[cx + Math.cos(a) * 16, hy + Math.sin(a) * 16], [cx + Math.cos(a + 0.12) * 16, hy + Math.sin(a + 0.12) * 16], [cx + Math.cos(a + 0.06) * 34, hy + Math.sin(a + 0.06) * 34]], p.cast ? glow(255, 200, 80, 0.95) : GOLD);
  }
  // torso: armored, cracked open over a burning core
  s.ell(cx, 64 + b + ty, 28, 30, HIDE);
  s.speckle(cx, 64 + b + ty, 24, HIDE_D, 80);
  for (const sx of [-1, 1]) s.poly([[cx + sx * 8, 44 + b + ty], [cx + sx * 26, 50 + b + ty], [cx + sx * 22, 84 + b + ty], [cx + sx * 8, 80 + b + ty]], [84, 70, 60]);
  s.ell(cx, 62 + b + ty, 8, 11, glow(255, 160, 50, 0.95), 0);
  s.ell(cx, 62 + b + ty, 4, 6, glow(255, 245, 200, 1), 0);
  // head: crowned skull-mask
  s.ell(cx, hy, 12, 13, HIDE_D);
  s.ell(cx, hy + 3, 9, 10, BONE);
  s.rect(cx - 7, hy, 5, 3, EYE);
  s.rect(cx + 2, hy, 5, 3, EYE);
  s.rect(cx - 5, hy + 8, 10, p.cast || p.atk ? 3 : 1, [60, 10, 10]);
  for (let i = -2; i <= 2; i++) s.poly([[cx + i * 5 - 2, hy - 10], [cx + i * 5 + 2, hy - 10], [cx + i * 5, hy - 22 - (i === 0 ? 6 : 0)]], GOLD);
  // arms: left casting hand, right great blade
  const blade = (x0: number, y0: number, x1: number, y1: number, hot: boolean) => {
    const c = hot ? glow(120, 190, 255, 1) : ([180, 186, 200] as RGBA);
    for (let k = -2; k <= 2; k++) s.line(x0 + k, y0, x1 + k, y1, k === 0 ? (hot ? glow(230, 245, 255, 1) : [230, 236, 246]) : c);
  };
  if (p.atk === 1) {
    s.limb(cx + 26, 48 + b, cx + 34, 14 + b, 8, 6, HIDE);
    blade(cx + 36, 12 + b, cx + 40, -40 + b + 44, true);
    s.limb(cx - 26, 48 + b, cx - 36, 70 + b, 8, 6, HIDE);
  } else if (p.atk === 2) {
    s.limb(cx + 26, 48 + b, cx + 6, 82 + b, 8, 6, HIDE);
    blade(cx + 6, 84 + b, cx - 56, 120 + b, true);
    for (let i = 0; i < 8; i++) s.set(cx - 56 + i * 8, 126 + b, glow(160, 210, 255, 0.85));
    s.limb(cx - 26, 48 + b, cx - 36, 70 + b, 8, 6, HIDE);
  } else {
    s.limb(cx + 26, 48 + b, cx + 36, 84 + b, 8, 6, HIDE);
    blade(cx + 38, 84 + b, cx + 50, 132 + b, false);
    if (p.cast) {
      s.limb(cx - 26, 48 + b, cx - 44, 16 + b, 8, 6, HIDE);
      s.ell(cx - 46, 10 + b, 11, 11, glow(255, 120, 40, 0.85), 0);
      s.ell(cx - 46, 10 + b, 5, 5, glow(255, 240, 200, 1), 0);
    } else s.limb(cx - 26, 48 + b, cx - 38, 78 + b, 8, 6, HIDE);
  }
  if (p.limp) s.speckle(cx, 64, 20, [120, 20, 20], 60);
  if (p.pain) s.speckle(cx, 64, 20, [255, 230, 200], 60);
  s.finish([10, 4, 6]);
  return s;
}

/** Bright gold ring burst marker for the Archon's sigil rings. */
export function sigilRing(k: number): Pix {
  const s = new Pix(48, 24, 65 + k);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x - 23.5) / 23, (y - 11.5) / 11);
      if (d > 1) continue;
      const ring = Math.max(0, 1 - Math.abs(d - 0.9) / 0.08) + Math.max(0, 1 - Math.abs(d - 0.55 - k * 0.1) / 0.06);
      if (ring > 0.05) s.set(x, y, glow(255, 120 + k * 60, 40, Math.min(1, ring)));
    }
  return s;
}
