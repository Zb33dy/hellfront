import { Vector3 } from '@babylonjs/core';
import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { AltInput, Weapon, WeaponFrameState } from './weapon';

export class Shotgun implements Weapon {
  readonly id = 'shotgun' as const;
  readonly ammo = 'shells' as const;
  readonly ammoPerShot = WEAPONS.shotgun.ammoPerShot;
  readonly interval = WEAPONS.shotgun.fireInterval;
  sinceFire = 10;
  private pumped = true;
  private ejected = true;
  private double = false;
  private pumped2 = true;

  /** Right click: both barrels' worth — two shells, double the pellets, then two pumps. */
  alt(_dt: number, ctx: GameCtx, rmb: AltInput): number {
    if (!rmb.pressed || !rmb.ready) return 0;
    const p = ctx.player;
    if (p.ammo.shells < 2) {
      ctx.sound('weapon_empty');
      return 0;
    }
    p.ammo.shells -= 2;
    const d = WEAPONS.shotgun;
    ctx.sound('shotgun_fire', null, { volume: 1.2 });
    ctx.sound('shotgun_fire', null, { pitch: 0.75, volume: 0.9 });
    ctx.muzzleFlash(true);
    ctx.playerShot({ ...d, pellets: 18, spread: d.spread * 1.35, damageMin: 8, damageMax: 12 });
    p.recoil += d.recoil * 1.8;
    ctx.shake.add(d.shake * 1.7);
    ctx.noise(p.pos, d.noise + 6);
    // kickback
    const f = p.forward;
    p.vel.x -= f.x * 3.5;
    p.vel.z -= f.z * 3.5;
    this.sinceFire = 0;
    this.pumped = false;
    this.ejected = false;
    this.double = true;
    this.pumped2 = false;
    return 1.45;
  }

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
    this.double = false;
  }

  update(dt: number, ctx: GameCtx): void {
    this.sinceFire += dt;
    if (!this.pumped && this.sinceFire > 0.3) {
      this.pumped = true;
      ctx.sound('shotgun_pump');
    }
    if (this.double && !this.pumped2 && this.sinceFire > 0.78) {
      this.pumped2 = true;
      ctx.sound('shotgun_pump', null, { pitch: 0.92 });
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
    else if (this.double && t < 0.92) frame = 'pump1';
    else if (this.double && t < 1.08) frame = 'pump2';
    return { frame, flash: t < 0.06 ? 2 : 0, kick, jitter: 0 };
  }

  select(): void {}
  deselect(): void {}
}
