import { Vector3 } from '@babylonjs/core';
import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { Weapon, WeaponFrameState } from './weapon';

/** Anti-materiel rifle: a single devastating round, then a long bolt cycle. Hold RMB to scope. */
export class Sniper implements Weapon {
  readonly id = 'sniper' as const;
  readonly ammo = 'rounds' as const;
  readonly ammoPerShot = WEAPONS.sniper.ammoPerShot;
  readonly interval = WEAPONS.sniper.fireInterval;
  sinceFire = 10;
  private cycled = true;
  private ejected = true;

  fire(ctx: GameCtx): void {
    const d = WEAPONS.sniper;
    ctx.sound('shotgun_fire', null, { pitch: 0.55, volume: 1.3 });
    ctx.sound('barrel_explode', null, { pitch: 1.8, volume: 0.35 });
    ctx.muzzleFlash(true);
    ctx.playerShot(d);
    ctx.player.recoil += d.recoil;
    ctx.shake.add(d.shake);
    ctx.noise(ctx.player.pos, d.noise);
    this.cycled = false;
    this.ejected = false;
  }

  update(dt: number, ctx: GameCtx): void {
    this.sinceFire += dt;
    if (!this.cycled && this.sinceFire > 0.45) {
      this.cycled = true;
      ctx.sound('shotgun_pump', null, { pitch: 0.75 });
    }
    if (!this.ejected && this.sinceFire > 0.55) {
      this.ejected = true;
      const p = ctx.player;
      const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const from = p.eye.add(right.scale(0.22)).add(p.forward.scale(0.45)).add(new Vector3(0, -0.25, 0));
      ctx.debris.spawn('casing', from, right.scale(2.4 + Math.random()).add(new Vector3(0, 2.6, 0)), 6);
    }
  }

  frameState(): WeaponFrameState {
    const t = this.sinceFire;
    let frame: WeaponFrameState['frame'] = 'idle';
    let kick = 0;
    if (t < 0.14) {
      frame = 'fire';
      kick = 0.14 * (1 - t / 0.14);
    } else if (t > 0.4 && t < 0.75) frame = t < 0.58 ? 'pump1' : 'pump2';
    return { frame, flash: t < 0.06 ? 2 : 0, kick, jitter: 0 };
  }

  select(): void {}
  deselect(): void {}
}
