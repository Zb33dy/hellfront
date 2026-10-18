import { Pix, type RGBA } from './pixart';

// Original marine portrait for the HUD: 5 damage tiers × look direction × expressions.

export type FaceExpr = 'normal' | 'grin' | 'ouch' | 'rage' | 'dead';

const cache = new Map<string, HTMLCanvasElement>();
export const FACE_W = 32;
export const FACE_H = 36;

export function faceCanvas(tier: number, look: -1 | 0 | 1, expr: FaceExpr, scale = 3): HTMLCanvasElement {
  const key = `${tier}:${look}:${expr}:${scale}`;
  let c = cache.get(key);
  if (!c) {
    c = drawFace(tier, look, expr).toCanvas(scale);
    cache.set(key, c);
  }
  return c;
}

function drawFace(tier: number, look: -1 | 0 | 1, expr: FaceExpr): Pix {
  const p = new Pix(FACE_W, FACE_H, 3 + tier * 7);
  const dead = expr === 'dead';
  const pale = dead ? 0.7 : 1 - tier * 0.04;
  const SKIN: RGBA = [196 * pale, 140 * pale, 108 * pale];
  const SKIN_D: RGBA = [150 * pale, 98 * pale, 76 * pale];
  const HAIR: RGBA = [52, 40, 30];
  const BLOOD: RGBA = [150, 10, 8];
  const ox = dead ? 0 : look; // head turn
  const cx = 16 + ox;
  // neck + collar
  p.rect(10, 29, 12, 7, [60, 70, 52]);
  p.rect(12, 27, 8, 4, SKIN_D);
  // head
  p.ell(cx, 16, 10, 13, SKIN, 0.35);
  p.ell(cx, 25, 8, 5, SKIN_D, 0.2); // jaw
  p.ell(cx, 15, 9.5, 12, SKIN, 0.35);
  // hair buzzcut
  for (let y = 3; y < 10; y++)
    for (let x = cx - 9; x <= cx + 9; x++) {
      const dx = (x - cx) / 9.5, dy = (y - 15) / 12;
      if (dx * dx + dy * dy <= 1 && y < 8 + Math.abs(x - cx) * 0.25) p.set(x, y, HAIR);
    }
  // ears + headset
  p.ell(cx - 10, 17, 1.6, 3, SKIN_D);
  p.ell(cx + 10, 17, 1.6, 3, SKIN_D);
  p.rect(cx - 12, 15, 3, 6, [40, 42, 46]);
  p.line(cx - 11, 21, cx - 6, 27, [40, 42, 46]);
  p.set(cx - 6, 27, [200, 40, 30]);
  // brows
  const browY = expr === 'rage' || tier >= 3 ? 12 : 11;
  const angry = expr === 'rage' || expr === 'ouch';
  p.line(cx - 7, browY + (angry ? 0 : 0), cx - 2, browY + (angry ? 1 : 0), HAIR);
  p.line(cx + 2, browY + (angry ? 1 : 0), cx + 7, browY, HAIR);
  // eyes
  const ey = 14;
  const lookPx = dead ? 0 : look;
  const eye = (ex: number) => {
    if (dead) {
      p.line(ex - 2, ey - 1, ex + 2, ey + 1, [40, 20, 20]);
      p.line(ex - 2, ey + 1, ex + 2, ey - 1, [40, 20, 20]);
      return;
    }
    const h = expr === 'ouch' ? 3 : tier >= 3 ? 1 : 2;
    p.rect(ex - 2, ey - Math.floor(h / 2), 5, h, [236, 232, 224]);
    p.rect(ex + lookPx, ey - Math.floor(h / 2), 2, h, [50, 80, 120]);
    if (h > 1) p.set(ex + lookPx, ey - Math.floor(h / 2), [20, 30, 40]);
  };
  eye(cx - 4);
  eye(cx + 4);
  // nose
  p.line(cx, 15, cx, 19, SKIN_D);
  p.set(cx - 1, 20, SKIN_D);
  p.set(cx + 1, 20, SKIN_D);
  // mouth
  const my = 24;
  if (dead) {
    p.rect(cx - 3, my, 7, 2, [60, 16, 14]);
  } else if (expr === 'grin') {
    p.rect(cx - 5, my - 1, 11, 3, [60, 16, 14]);
    p.rect(cx - 4, my - 1, 9, 1, [240, 236, 220]);
    p.set(cx - 6, my - 2, SKIN_D);
    p.set(cx + 6, my - 2, SKIN_D);
  } else if (expr === 'ouch') {
    p.ell(cx, my + 1, 2.5, 2.5, [60, 16, 14], 0);
  } else if (expr === 'rage') {
    p.rect(cx - 4, my, 9, 2, [240, 236, 220]);
    p.line(cx - 4, my + 1, cx + 4, my + 1, [80, 20, 18]);
  } else {
    p.line(cx - 4, my + (tier >= 2 ? 1 : 0), cx + 4, my, [110, 50, 40]);
  }
  // stubble + scar
  p.speckle(cx, 25, 6, SKIN_D, 18);
  p.line(cx + 6, 17, cx + 8, 21, [160, 90, 80]);
  // damage
  if (tier >= 1) p.speckle(cx - 6, 8, 3, BLOOD, 10);
  if (tier >= 2) {
    p.ell(cx + 6, 15, 2.5, 2, [140, 80, 110], 0);
    p.line(cx - 7, 5, cx - 5, 12, BLOOD);
  }
  if (tier >= 3) {
    p.speckle(cx + 3, 22, 5, BLOOD, 22);
    p.line(cx + 2, 2, cx + 3, 14, BLOOD);
  }
  if (tier >= 4 || dead) {
    p.speckle(cx, 14, 10, BLOOD, 60);
    p.line(cx - 3, 9, cx - 5, 26, BLOOD);
  }
  p.finish([20, 12, 10]);
  return p;
}
