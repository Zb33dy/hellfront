import { Vector3 } from '@babylonjs/core';
import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { AltInput, Weapon, WeaponFrameState } from './weapon';

const BEAM = { minBolts: 10, maxBolts: 25, perBolt: 9 };
const CHARGE = { max: 1.2, fuelEvery: 0.07 };

/** Captured heretic bolter: fully automatic, heavy blue-flame bolts. */
export class Bolter implements Weapon {
  readonly id = 'bolter' as const;
  readonly ammo = 'bolts' as const;
  readonly ammoPerShot = 1;
  readonly interval = WEAPONS.bolter.fireInterval;
  sinceFire = 10;

  /** Right click: dumps up to 25 bolts into one piercing beam. */
  alt(_dt: number, ctx: GameCtx, rmb: AltInput): number {
    if (!rmb.pressed || !rmb.ready) return 0;
    const p = ctx.player;
    if (p.ammo.bolts < BEAM.minBolts) {
      ctx.sound('weapon_empty');
      return 0;
    }
    const n = Math.min(BEAM.maxBolts, p.ammo.bolts);
    p.ammo.bolts -= n;
    ctx.sound('fireball_cast', null, { pitch: 0.55, volume: 1.2 });
    ctx.sound('barrel_explode', null, { pitch: 1.7, volume: 0.6 });
    ctx.muzzleFlash(true);
    ctx.playerBeam(n * BEAM.perBolt);
    p.recoil += 0.09;
    ctx.shake.add(0.45);
    ctx.noise(p.pos, 34);
    this.sinceFire = 0;
    return 1.0;
  }

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
  private charge = 0;
  private fuelT = 0;

  /** Hold right click to build a hell-fire orb, release to hurl it far. */
  alt(dt: number, ctx: GameCtx, rmb: AltInput): number {
    const p = ctx.player;
    if (rmb.down && (this.charge > 0 || rmb.ready)) {
      if (this.charge < CHARGE.max && p.ammo.fuel > 0) {
        this.charge = Math.min(CHARGE.max, this.charge + dt);
        this.fuelT -= dt;
        if (this.fuelT <= 0) {
          this.fuelT = CHARGE.fuelEvery;
          p.ammo.fuel--;
        }
        if (Math.random() < 0.5) ctx.sound('fireball_fly', null, { pitch: 0.8 + this.charge, volume: 0.25 });
      } else if (this.charge <= 0) {
        if (rmb.pressed) ctx.sound('weapon_empty');
        return 0;
      }
      const f = p.forward;
      const at = p.eye.add(f.scale(0.9)).add(new Vector3(0, -0.25, 0));
      ctx.particles.emit('fire', at, new Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2), 1 + Math.floor(this.charge * 3), 0.1 + this.charge * 0.25, 0.8 + this.charge);
      return 0.1;
    }
    if (this.charge > 0) {
      const k = this.charge / CHARGE.max;
      this.charge = 0;
      if (k < 0.12) return 0;
      ctx.sound('fireball_cast', null, { pitch: 1.2 - k * 0.5, volume: 1 + k * 0.4 });
      ctx.fireRocket({ speed: 26, damage: 50 + 150 * k, radius: 2.8 + 2.7 * k, sprite: 'fireball', tint: [0.55, 1.5, 0.75], scale: 0.9 + k * 1.1, guided: false, flame: true });
      ctx.shake.add(0.15 + k * 0.25);
      ctx.noise(p.pos, 18);
      this.sinceFire = 0;
      return 0.55;
    }
    return 0;
  }

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
  deselect(): void {
    this.charge = 0;
  }
}
