import { Vector3 } from '@babylonjs/core';
import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { Weapon, WeaponFrameState } from './weapon';

export class Pistol implements Weapon {
  readonly id = 'pistol' as const;
  readonly ammo = 'bullets' as const;
  readonly ammoPerShot = WEAPONS.pistol.ammoPerShot;
  readonly interval = WEAPONS.pistol.fireInterval;
  sinceFire = 10;

  fire(ctx: GameCtx): void {
    const d = WEAPONS.pistol;
    ctx.sound('pistol_fire');
    ctx.muzzleFlash(false);
    ctx.playerShot(d);
    ctx.player.recoil += d.recoil;
    ctx.shake.add(d.shake);
    ctx.noise(ctx.player.pos, d.noise);
    // eject a casing to the right
    const p = ctx.player;
    const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const f = p.forward;
    const from = p.eye.add(right.scale(0.25)).add(f.scale(0.4)).add(new Vector3(0, -0.2, 0));
    ctx.debris.spawn('casing', from, right.scale(2.5 + Math.random()).add(new Vector3(0, 2.4, 0)).add(f.scale(0.4)), 5);
  }

  update(dt: number): void {
    this.sinceFire += dt;
  }

  frameState(): WeaponFrameState {
    const t = this.sinceFire;
    const firing = t < 0.1;
    return { frame: firing ? 'fire' : 'idle', flash: t < 0.05 ? 1 : 0, kick: firing ? 0.05 * (1 - t / 0.1) : 0, jitter: 0 };
  }

  select(): void {}
  deselect(): void {}
}
