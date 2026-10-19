import { Vector3 } from '@babylonjs/core';
import { WEAPONS } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { AltInput, Weapon, WeaponFrameState } from './weapon';

export class Pistol implements Weapon {
  readonly id = 'pistol' as const;
  readonly ammo = 'bullets' as const;
  readonly ammoPerShot = WEAPONS.pistol.ammoPerShot;
  readonly interval = WEAPONS.pistol.fireInterval;
  sinceFire = 10;
  private burstLeft = 0;
  private burstT = 0;

  /** Right click: three quick rounds. */
  alt(dt: number, ctx: GameCtx, rmb: AltInput): number {
    const p = ctx.player;
    if (this.burstLeft <= 0) {
      if (!rmb.pressed || !rmb.ready) return 0;
      if (p.ammo.bullets < 1) {
        ctx.sound('weapon_empty');
        return 0;
      }
      this.burstLeft = Math.min(3, p.ammo.bullets);
      this.burstT = 0;
    }
    this.burstT -= dt;
    if (this.burstT <= 0 && this.burstLeft > 0) {
      p.ammo.bullets--;
      this.burstLeft--;
      this.burstT = 0.07;
      this.fire(ctx, 1.6);
      this.sinceFire = 0;
    }
    return this.burstLeft > 0 ? 0.2 : 0.5;
  }

  fire(ctx: GameCtx, spreadMul = 1): void {
    const d = spreadMul === 1 ? WEAPONS.pistol : { ...WEAPONS.pistol, spread: WEAPONS.pistol.spread * spreadMul };
    ctx.sound('pistol_fire');
    ctx.muzzleFlash(false);
    // armor-piercing upgrade: harder rounds that ignore shields and plating
    const ap = ctx.hasMod('pistol');
    ctx.piercingShot = ap;
    ctx.playerShot(ap ? { ...d, damageMin: d.damageMin * 1.5, damageMax: d.damageMax * 1.5 } : d);
    ctx.piercingShot = false;
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
  deselect(): void {
    this.burstLeft = 0;
  }
}
