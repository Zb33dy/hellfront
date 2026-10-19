import { ROCKET } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { Weapon, WeaponFrameState } from './weapon';

/** Rocket launcher: slow, loud, splash damage. Keep your distance. */
export class Launcher implements Weapon {
  readonly id = 'launcher' as const;
  readonly ammo = 'rockets' as const;
  readonly ammoPerShot = 1;
  readonly interval = ROCKET.interval;
  sinceFire = 10;

  fire(ctx: GameCtx): void {
    ctx.sound('shotgun_fire', null, { pitch: 0.45, volume: 1.1 });
    ctx.sound('fireball_cast', null, { pitch: 1.4, volume: 0.6 });
    ctx.muzzleFlash(true);
    ctx.fireRocket();
    ctx.player.recoil += 0.07;
    ctx.shake.add(0.3);
    ctx.noise(ctx.player.pos, 30);
  }

  update(dt: number): void {
    this.sinceFire += dt;
  }

  frameState(): WeaponFrameState {
    const t = this.sinceFire;
    const firing = t < 0.15;
    return { frame: firing ? 'fire' : 'idle', flash: t < 0.07 ? 2 : 0, kick: firing ? 0.12 * (1 - t / 0.15) : 0, jitter: 0 };
  }

  select(): void {}
  deselect(): void {}
}
