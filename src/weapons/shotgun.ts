import { Vector3 } from '@babylonjs/core';
import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { Weapon, WeaponFrameState } from './weapon';

export class Shotgun implements Weapon {
  readonly id = 'shotgun' as const;
  readonly ammo = 'shells' as const;
  readonly ammoPerShot = WEAPONS.shotgun.ammoPerShot;
  readonly interval = WEAPONS.shotgun.fireInterval;
  sinceFire = 10;
  private pumped = true;
  private ejected = true;

  fire(ctx: GameCtx): void {
    const d = WEAPONS.shotgun;
    ctx.sound('shotgun_fire');
    ctx.muzzleFlash(true);
    ctx.playerShot(d);
    ctx.player.recoil += d.recoil;
    ctx.shake.add(d.shake);
    ctx.noise(ctx.player.pos, d.noise);
    this.pumped = false;
    this.ejected = false;
  }

  update(dt: number, ctx: GameCtx): void {
    this.sinceFire += dt;
    if (!this.pumped && this.sinceFire > 0.3) {
      this.pumped = true;
      ctx.sound('shotgun_pump');
    }
    if (!this.ejected && this.sinceFire > 0.42) {
      this.ejected = true;
      const p = ctx.player;
      const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const from = p.eye.add(right.scale(0.2)).add(p.forward.scale(0.45)).add(new Vector3(0, -0.3, 0));
      ctx.debris.spawn('shellCasing', from, right.scale(2.2 + Math.random()).add(new Vector3(0, 2.8, 0)), 6);
    }
  }

  frameState(): WeaponFrameState {
    const t = this.sinceFire;
    let frame: WeaponFrameState['frame'] = 'idle';
    let kick = 0;
    if (t < 0.12) {
      frame = 'fire';
      kick = 0.09 * (1 - t / 0.12);
    } else if (t < 0.3) frame = 'idle';
    else if (t < 0.45) frame = 'pump2';
    else if (t < 0.62) frame = 'pump1';
    else if (t < 0.75) frame = 'pump2';
    return { frame, flash: t < 0.06 ? 2 : 0, kick, jitter: 0 };
  }

  select(): void {}
  deselect(): void {}
}
