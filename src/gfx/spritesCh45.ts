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

// ------------------------------------------------------------------ Sniper rifle, rounds, grenades (pickups + thrown)

export function sniperPickup(): Pix {
  const s = new Pix(70, 18, 95);
  s.rect(2, 8, 44, 3, [52, 54, 60]);
  s.rect(0, 7, 4, 5, [40, 40, 46]);
  s.rect(26, 3, 16, 4, [30, 32, 36]);
  s.set(27, 4, glow(90, 160, 255, 1));
  s.rect(40, 7, 12, 6, [70, 74, 82]);
  s.poly([[50, 6], [62, 6], [69, 13], [66, 17], [56, 14], [50, 13]], [44, 46, 40]);
  s.rect(44, 13, 3, 4, [40, 40, 44]);
  s.finish();
  return s;
}

export function roundsBox(): Pix {
  const s = new Pix(22, 16, 96);
  s.rect(1, 6, 20, 9, [70, 76, 56]);
  s.rect(3, 9, 16, 3, [200, 190, 140]);
  for (let x = 3; x < 19; x += 4) {
    s.rect(x, 0, 2, 7, [210, 170, 70]);
    s.rect(x, 0, 2, 2, [150, 150, 160]);
  }
  s.finish();
  return s;
}

export function grenadeSprite(lit: boolean): Pix {
  const s = new Pix(10, 12, 97);
  s.ell(5, 7, 4, 4.5, [70, 84, 56]);
  s.rect(3, 1, 4, 2, [150, 150, 160]);
  s.set(7, 2, [190, 190, 200]);
  for (let y = 5; y < 11; y += 2) s.set(5, y, [40, 50, 34]);
  if (lit) s.set(5, 1, glow(255, 60, 40, 1));
  s.finish();
  return s;
}

export function grenadePickup(): Pix {
  const s = new Pix(24, 14, 98);
  s.blit(grenadeSprite(false), 1, 1);
  s.blit(grenadeSprite(false), 12, 2);
  return s;
}

// ------------------------------------------------------------------ Warhound: two-headed hellhound (Siege mode)

export function warhound(p: Pose): Pix {
  const s = new Pix(112, 80, 61);
  const b = p.bob ?? 0;
  const HIDE: RGBA = [92, 34, 26], HIDE_D: RGBA = [54, 18, 16], SPINE: RGBA = [210, 196, 170], EMBER = glow(255, 120, 30, 1);
  const crouch = p.atk === 1 ? 6 : 0;
  const ty = (p.pain ? -2 : 0) + crouch;
  // hind + fore legs (front view, slightly splayed)
  const lf = p.lFoot ?? [34, 79], rf = p.rFoot ?? [78, 79];
  s.limb(40, 50 + b + ty, lf[0], lf[1] - 3, 7, 4, HIDE_D);
  s.limb(72, 50 + b + ty, rf[0], rf[1] - 3, 7, 4, HIDE_D);
  s.limb(48, 54 + b + ty, lf[0] + 10, 77, 5, 3, HIDE_D);
  s.limb(64, 54 + b + ty, rf[0] - 10, 77, 5, 3, HIDE_D);
  for (const x of [lf[0], rf[0], lf[0] + 10, rf[0] - 10]) {
    s.ell(x, 77, 5, 2.4, [40, 20, 18]);
    for (let k = -1; k <= 1; k++) s.set(x + k * 2, 79, SPINE);
  }
  // barrel chest with glowing cracks
  s.ell(56, 46 + b + ty, 24, 16, HIDE);
  s.speckle(56, 46 + b + ty, 18, HIDE_D, 70);
  for (let k = 0; k < 5; k++) s.line(44 + k * 6, 40 + b + ty, 46 + k * 6, 52 + b + ty, glow(255, 90, 20, 0.7));
  // spine ridge
  for (let k = 0; k < 7; k++) s.poly([[40 + k * 5, 33 + b + ty], [44 + k * 5, 33 + b + ty], [42 + k * 5, 26 + b + ty]], SPINE);
  // two heads on thick necks
  const head = (cx: number, dir: number) => {
    const hy = 30 + b + ty + (p.pain ? -2 : 0);
    s.limb(56 + dir * 10, 40 + b + ty, cx, hy + 4, 8, 7, HIDE);
    s.ell(cx, hy, 11, 9, HIDE);
    s.poly([[cx - 6 * dir, hy - 7], [cx - 14 * dir, hy - 18], [cx - 2 * dir, hy - 9]], SPINE); // ear-horn
    s.rect(cx - 6, hy - 3, 4, 2, glow(255, 200, 40, 1));
    s.rect(cx + 2, hy - 3, 4, 2, glow(255, 200, 40, 1));
    const open = p.atk === 2 || p.cast ? 6 : 2;
    s.ell(cx, hy + 7, 8, 3 + open * 0.5, HIDE_D);
    s.rect(cx - 6, hy + 5, 12, open, [40, 4, 4]);
    for (let i = cx - 6; i <= cx + 6; i += 2) {
      s.set(i, hy + 5, SPINE);
      s.set(i, hy + 5 + open, SPINE);
    }
    if (p.cast) {
      s.ell(cx + dir * 4, hy + 14, 7, 6, glow(255, 140, 40, 0.9), 0);
      s.ell(cx + dir * 4, hy + 14, 3, 3, glow(255, 240, 180, 1), 0);
    }
  };
  head(32, -1);
  head(80, 1);
  if (p.atk === 2) for (let k = 0; k < 6; k++) s.set(30 + s.rand() * 52, 44 + s.rand() * 8, EMBER);
  if (p.pain) s.speckle(56, 44 + b, 14, [255, 230, 200], 40);
  s.finish([14, 6, 6]);
  return s;
}

// ------------------------------------------------------------------ Rocket launcher pickups + rocket in flight

export function launcherPickup(): Pix {
  const s = new Pix(64, 20, 99);
  s.rect(2, 6, 50, 8, [70, 78, 58]);
  s.rect(2, 7, 50, 2, [96, 106, 80]);
  s.ell(3, 10, 2, 4, [30, 32, 26]);
  s.rect(52, 5, 8, 10, [40, 42, 36]);
  s.rect(26, 14, 4, 5, [40, 40, 44]);
  s.rect(36, 14, 4, 5, [40, 40, 44]);
  for (let k = 0; k < 3; k++) s.rect(10 + k * 12, 6, 2, 8, [200, 170, 40]);
  s.finish();
  return s;
}

export function rocketsBox(): Pix {
  const s = new Pix(24, 16, 100);
  s.rect(1, 7, 22, 8, [70, 78, 58]);
  for (let k = 0; k < 3; k++) {
    s.rect(3 + k * 7, 0, 4, 9, [150, 154, 160]);
    s.poly([[3 + k * 7, 1], [7 + k * 7, 1], [5 + k * 7, -2]], [200, 40, 30]);
  }
  s.finish();
  return s;
}

export function rocketSprite(k: number): Pix {
  const s = new Pix(18, 18, 101 + k);
  s.ell(9, 9, 7 + k, 7 + k, glow(255, 150, 50, 0.6), 0);
  s.ell(9, 9, 4, 4, glow(255, 230, 160, 1), 0);
  s.ell(9, 9, 2, 2, [80, 84, 70]);
  return s;
}
