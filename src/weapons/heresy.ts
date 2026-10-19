import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { Weapon, WeaponFrameState } from './weapon';

/** Captured heretic bolter: fully automatic, heavy blue-flame bolts. */
export class Bolter implements Weapon {
  readonly id = 'bolter' as const;
  readonly ammo = 'bolts' as const;
  readonly ammoPerShot = 1;
  readonly interval = WEAPONS.bolter.fireInterval;
  sinceFire = 10;

  fire(ctx: GameCtx): void {
    const d = WEAPONS.bolter;
    ctx.sound('pistol_fire', null, { pitch: 0.55, volume: 1.1 });
    ctx.muzzleFlash(false);
    ctx.playerShot(d);
    ctx.player.recoil += d.recoil;
    ctx.shake.add(d.shake);
    ctx.noise(ctx.player.pos, d.noise);
  }

  update(dt: number): void {
    this.sinceFire += dt;
  }

  frameState(): WeaponFrameState {
    const t = this.sinceFire;
    const firing = t < 0.07;
    return { frame: firing ? 'fire' : 'idle', flash: t < 0.04 ? 1 : 0, kick: firing ? 0.05 : 0, jitter: firing ? (Math.random() - 0.5) * 0.01 : 0 };
  }

  select(): void {}
  deselect(): void {}
}

/** Captured hellflamer: a short, wide cone of green hell-fire. */
export class Flamer implements Weapon {
  readonly id = 'flamer' as const;
  readonly ammo = 'fuel' as const;
  readonly ammoPerShot = 1;
  readonly interval = 0.07;
  sinceFire = 10;

  fire(ctx: GameCtx): void {
    if (this.sinceFire > 0.3) ctx.sound('fireball_fly', null, { pitch: 1.6, volume: 0.9 });
    ctx.playerFlame();
    ctx.noise(ctx.player.pos, 14);
  }

  update(dt: number): void {
    this.sinceFire += dt;
  }

  frameState(): WeaponFrameState {
    const firing = this.sinceFire < 0.12;
    return { frame: firing ? 'fire' : 'idle', flash: 0, kick: 0, jitter: firing ? (Math.random() - 0.5) * 0.008 : 0 };
  }

  select(): void {}
  deselect(): void {}
}
