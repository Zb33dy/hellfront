import { Pix, glow, type RGBA } from './pixart';

// First-person weapon frames, original pixel art. 160×110 logical pixels, bottom-anchored.

export const VM_W = 160;
export const VM_H = 110;

const SKIN_D: RGBA = [140, 96, 72];
const GLOVE: RGBA = [52, 50, 46];
const SLEEVE: RGBA = [72, 82, 60];
const STEEL: RGBA = [96, 100, 110];
const STEEL_D: RGBA = [52, 54, 60];
const WOOD: RGBA = [126, 82, 46];

function arm(p: Pix, x0: number, y0: number, x1: number, y1: number, r: number) {
  p.limb(x0, y0, x1, y1, r + 3, r + 1, SLEEVE, 0.5);
}

function pistol(fire: boolean): Pix {
  const p = new Pix(VM_W, VM_H, 1);
  const dy = fire ? 6 : 0;
  arm(p, 104, 112, 88, 84 + dy, 9);
  p.ell(84, 80 + dy, 11, 9, GLOVE, 0.5);
  // frame + slide (seen from behind/above)
  p.poly([[74, 78 + dy], [94, 78 + dy], [90, 44 + dy], [78, 44 + dy]], STEEL_D);
  p.poly([[76, 70 + dy - (fire ? 4 : 0)], [92, 70 + dy - (fire ? 4 : 0)], [89, 38 + dy - (fire ? 4 : 0)], [79, 38 + dy - (fire ? 4 : 0)]], STEEL);
  p.rect(82, 36 + dy - (fire ? 4 : 0), 4, 3, [30, 30, 34]);
  p.rect(80, 62 + dy, 8, 3, [40, 40, 44]);
  p.line(84, 40 + dy, 84, 68 + dy, [140, 144, 156]);
  p.ell(78, 82 + dy, 6, 5, SKIN_D, 0.4);
  p.finish([14, 12, 12]);
  return p;
}

function shotgun(state: 'idle' | 'fire' | 'pump1' | 'pump2'): Pix {
  const p = new Pix(VM_W, VM_H, 2);
  const dy = state === 'fire' ? 8 : 0;
  const pump = state === 'pump1' ? 10 : state === 'pump2' ? 5 : 0;
  // right arm + grip
  arm(p, 118, 114, 100, 92 + dy, 10);
  p.ell(98, 90 + dy, 12, 9, GLOVE, 0.5);
  // stock + receiver
  p.poly([[70, 110], [96, 110], [92, 70 + dy], [74, 70 + dy]], WOOD);
  p.poly([[72, 74 + dy], [94, 74 + dy], [88, 46 + dy], [78, 46 + dy]], STEEL_D);
  // barrels converge upward
  p.poly([[78, 50 + dy], [88, 50 + dy], [86, 14 + dy], [80, 14 + dy]], STEEL);
  p.line(83, 16 + dy, 83, 48 + dy, [150, 154, 166]);
  p.ell(83, 14 + dy, 3, 2, [20, 20, 24]);
  // pump forend + left hand
  const fy = 52 + dy + pump;
  p.poly([[74, fy + 10], [92, fy + 10], [90, fy - 6], [76, fy - 6]], WOOD);
  for (let k = 0; k < 4; k++) p.line(76, fy - 3 + k * 3, 90, fy - 3 + k * 3, [96, 60, 32]);
  arm(p, 30, 114, 62, fy + 14, 9);
  p.ell(70, fy + 6, 11, 8, GLOVE, 0.5);
  p.finish([14, 12, 12]);
  return p;
}

function chainsword(state: 'idle0' | 'idle1' | 'swing0' | 'swing1'): Pix {
  const p = new Pix(VM_W, VM_H, 3);
  const teeth = state === 'idle1' ? 1 : 0;
  let bx0 = 112, by0 = 92, bx1 = 132, by1 = 10; // blade base → tip
  let hx = 110, hy = 98;
  if (state === 'swing0') {
    bx0 = 96; by0 = 80; bx1 = 52; by1 = 18; hx = 100; hy = 90;
  } else if (state === 'swing1') {
    bx0 = 100; by0 = 70; bx1 = 14; by1 = 64; hx = 104; hy = 82;
  }
  const len = Math.hypot(bx1 - bx0, by1 - by0);
  const nx = -(by1 - by0) / len, ny = (bx1 - bx0) / len;
  const W = 7;
  p.poly([[bx0 + nx * W, by0 + ny * W], [bx1 + nx * (W - 2), by1 + ny * (W - 2)], [bx1 - nx * (W - 2), by1 - ny * (W - 2)], [bx0 - nx * W, by0 - ny * W]], [170, 176, 186]);
  p.line(bx0, by0, bx1, by1, [210, 214, 224]);
  // chain teeth
  const steps = Math.floor(len / 4);
  for (let i = 0; i < steps; i++) {
    const t = (i + teeth * 0.5) / steps;
    const x = bx0 + (bx1 - bx0) * t, y = by0 + (by1 - by0) * t;
    p.set(x + nx * (W + 1), y + ny * (W + 1), [60, 60, 66]);
    p.set(x - nx * (W + 1), y - ny * (W + 1), [60, 60, 66]);
    if (i % 2 === teeth) {
      p.set(x + nx * (W + 2), y + ny * (W + 2), [230, 230, 240]);
      p.set(x - nx * (W + 2), y - ny * (W + 2), [230, 230, 240]);
    }
  }
  // motor housing + guard
  p.ell(hx, hy - 6, 14, 10, [150, 30, 24], 0.5);
  p.rect(hx - 8, hy - 10, 10, 4, [220, 180, 60]);
  p.ell(hx + 4, hy - 8, 3, 3, glow(255, 120, 40, 0.6), 0);
  arm(p, 140, 114, hx + 6, hy + 4, 10);
  p.ell(hx + 2, hy + 2, 12, 8, GLOVE, 0.5);
  p.finish([14, 12, 12]);
  return p;
}

function flash(big: boolean): Pix {
  const p = new Pix(48, 40, big ? 5 : 4);
  const cx = 24, cy = 24;
  const r = big ? 18 : 11;
  for (let k = 0; k < (big ? 12 : 8); k++) {
    const a = (k / (big ? 12 : 8)) * Math.PI * 2 + p.rand() * 0.3;
    const l = r * (0.6 + p.rand() * 0.5);
    p.limb(cx, cy, cx + Math.cos(a) * l, cy + Math.sin(a) * l * 0.8, 2.5, 0.6, [255, 170, 60]);
  }
  p.ell(cx, cy, r * 0.55, r * 0.45, [255, 220, 120], 0);
  p.ell(cx, cy, r * 0.3, r * 0.25, [255, 255, 230], 0);
  return p;
}

export interface WeaponFrames {
  pistol: { idle: HTMLCanvasElement; fire: HTMLCanvasElement };
  shotgun: { idle: HTMLCanvasElement; fire: HTMLCanvasElement; pump1: HTMLCanvasElement; pump2: HTMLCanvasElement };
  chainsword: { idle0: HTMLCanvasElement; idle1: HTMLCanvasElement; swing0: HTMLCanvasElement; swing1: HTMLCanvasElement };
  flashSmall: HTMLCanvasElement;
  flashBig: HTMLCanvasElement;
}

let frames: WeaponFrames | null = null;

export function weaponFrames(): WeaponFrames {
  frames ??= {
    pistol: { idle: pistol(false).toCanvas(), fire: pistol(true).toCanvas() },
    shotgun: {
      idle: shotgun('idle').toCanvas(), fire: shotgun('fire').toCanvas(),
      pump1: shotgun('pump1').toCanvas(), pump2: shotgun('pump2').toCanvas(),
    },
    chainsword: {
      idle0: chainsword('idle0').toCanvas(), idle1: chainsword('idle1').toCanvas(),
      swing0: chainsword('swing0').toCanvas(), swing1: chainsword('swing1').toCanvas(),
    },
    flashSmall: flash(false).toCanvas(),
    flashBig: flash(true).toCanvas(),
  };
  return frames;
}
