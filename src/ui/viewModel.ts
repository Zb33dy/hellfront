import type { WeaponId } from '../core/config';
import { VM_H, VM_W, weaponFrames } from '../gfx/weaponArt';
import { h } from './dom';

export type VMFrame = 'idle' | 'fire' | 'pump1' | 'pump2' | 'idle0' | 'idle1' | 'swing0' | 'swing1';

/** First-person weapon sprite drawn on a DOM canvas over the 3D view. */
export class ViewModel {
  readonly el = h('div', { class: 'viewmodel' });
  private canvas = h('canvas');
  private ctx: CanvasRenderingContext2D;
  private flashImg: HTMLCanvasElement;
  private lastKey = '';

  constructor() {
    this.canvas.width = VM_W;
    this.canvas.height = VM_H;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    const f = weaponFrames();
    this.flashImg = f.flashBig.cloneNode() as HTMLCanvasElement;
    this.flashImg.getContext('2d')!.drawImage(f.flashBig, 0, 0);
    this.flashImg.className = 'flash-img';
    this.el.append(this.canvas, this.flashImg);
  }

  /**
   * offsetX/Y in screen fractions of the view model box (bob, sway, recoil, raise/lower).
   * brightness: lighting at the player's position.
   */
  draw(weapon: WeaponId, frame: VMFrame, offsetX: number, offsetY: number, brightness: number, flash: 0 | 1 | 2, tilt = 0): void {
    const f = weaponFrames();
    const set = f[weapon] as Record<string, HTMLCanvasElement>;
    const img = set[frame] ?? set.idle ?? set.idle0;
    const key = weapon + frame;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.ctx.clearRect(0, 0, VM_W, VM_H);
      this.ctx.drawImage(img, 0, 0);
    }
    this.el.style.transform = `translate(calc(-50% + ${(offsetX * 100).toFixed(2)}%), ${(offsetY * 100).toFixed(2)}%) rotate(${tilt.toFixed(3)}rad)`;
    const b = Math.min(1.6, Math.max(0.25, brightness));
    this.canvas.style.filter = `brightness(${b.toFixed(2)})`;
    if (flash) {
      const big = flash === 2;
      const src = big ? f.flashBig : f.flashSmall;
      const fc = this.flashImg.getContext('2d')!;
      fc.clearRect(0, 0, this.flashImg.width, this.flashImg.height);
      fc.drawImage(src, 0, 0);
      this.flashImg.style.display = 'block';
      // muzzle position in view-model space
      const mx = weapon === 'shotgun' ? 83 : 84;
      const my = weapon === 'shotgun' ? 14 : 36;
      this.flashImg.style.left = `${((mx - 24) / VM_W) * 100}%`;
      this.flashImg.style.top = `${((my - 26) / VM_H) * 100}%`;
      this.flashImg.style.width = `${(48 / VM_W) * 100 * (big ? 1.25 : 1)}%`;
    } else {
      this.flashImg.style.display = 'none';
    }
  }

  setVisible(v: boolean): void {
    this.el.style.display = v ? 'block' : 'none';
  }
}
