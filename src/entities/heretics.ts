import { Color3, Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

const MARINE_SOUNDS: EnemySounds = { alert: 'zombie_alert', pain: 'zombie_pain', death: 'zombie_death', idle: 'zombie_alert', pitch: 0.55 };

/** Shared helpers for power-armored heretics. */
abstract class HereticMarine extends Enemy {
  readonly sounds: EnemySounds = MARINE_SOUNDS;

  protected face(ctx: GameCtx): void {
    const p = ctx.player;
    this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
  }

  protected muzzle(h = 1.5, side = 0.45): Vector3 {
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return new Vector3(this.pos.x, this.pos.y + h, this.pos.z).add(right.scale(side)).add(new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).scale(this.radius + 0.3));
  }

  protected aimAt(ctx: GameCtx, from: Vector3, spread: number): Vector3 {
    const p = ctx.player;
    const d = new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z).subtract(from).normalize();
    d.x += rand(-spread, spread);
    d.y += rand(-spread, spread) * 0.5;
    d.z += rand(-spread, spread);
    return d.normalize();
  }
}

/**
 * Boltgunner — mid/long range. Fires accurate bursts of blue-flame bolts, then breaks line of
 * sight by sidestepping toward cover before the next burst (suppress, relocate, suppress).
 */
export class Boltgunner extends HereticMarine {
  readonly kind = 'boltgunner' as const;
  private shots = 0;
  private relocate = new Vector3();

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('boltgunner', x, z, angle, hpMul);
  }

  tryAttack(_ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los || this.attackCD > 0 || dist > this.def.rangedRange) return false;
    this.setState('attack');
    this.shots = 0;
    return true;
  }

  private pickCover(ctx: GameCtx): void {
    const p = ctx.player;
    const to = new Vector3(this.pos.x - p.pos.x, 0, this.pos.z - p.pos.z).normalize();
    const side = new Vector3(-to.z, 0, to.x);
    const eye = p.eye;
    let best = side.scale(Math.random() < 0.5 ? 1 : -1);
    for (const sgn of [1, -1]) {
      const probe = this.pos.add(side.scale(sgn * 4));
      if (!ctx.world.los(eye, new Vector3(probe.x, this.pos.y + 1.5, probe.z))) {
        best = side.scale(sgn); // that side is behind cover
        break;
      }
    }
    // back away if the player got close
    if (Vector3.Distance(this.pos, p.pos) < 7) best.addInPlace(to.scale(0.8));
    this.relocate.copyFrom(best.normalize());
  }

  updateAttack(dt: number, ctx: GameCtx): boolean {
    this.attackT += dt;
    if (this.attackPhase === 0) {
      this.face(ctx);
      if (this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
        this.attackPhase = 1;
        this.attackT = 0;
      }
      return true;
    }
    if (this.attackPhase === 1) {
      this.face(ctx);
      if (this.attackT >= 0.12) {
        this.attackT = 0;
        const from = this.muzzle(1.45, 0.2);
        ctx.projectiles.fireball(from, this.aimAt(ctx, from, 0.025), this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, {
          speed: 30, sprite: 'hbolt', scale: 0.9, color: new Color3(0.4, 0.6, 1), quiet: true,
        });
        ctx.sound('pistol_fire', this.pos, { pitch: 0.65, volume: 0.7 });
        if (++this.shots >= 5) {
          this.attackPhase = 2;
          this.attackT = 0;
          this.pickCover(ctx);
        }
      }
      return true;
    }
    // relocate toward cover
    ctx.world.move(this, this.relocate.x * 4.2 * dt, this.relocate.z * 4.2 * dt, 0.6);
    this.moving = true;
    this.animT += dt;
    if (this.attackT > 1.1) {
      this.moving = false;
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.attackPhase === 2) return `boltgunner_walk${Math.floor(this.animT * 6) % 4}`;
    return this.attackPhase === 1 && this.attackT < 0.06 ? 'boltgunner_atk1' : 'boltgunner_atk0';
  }
}

/**
 * Hellflamer — short range. Sprays a wide cone of armor-piercing green hell-fire for over a second;
 * it shreds armor, so get out of the cone.
 */
export class Hellflamer extends HereticMarine {
  readonly kind = 'hellflamer' as const;
  private puffT = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('hellflamer', x, z, angle, hpMul);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los || this.attackCD > 0 || dist > this.def.rangedRange) return false;
    this.setState('attack');
    ctx.sound('fireball_cast', this.pos, { pitch: 1.3, volume: 0.8 });
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const want = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    // tracks slowly while spraying: strafing out of the cone works
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += Math.max(-1.4 * dt, Math.min(1.4 * dt, d));
    if (this.attackPhase === 0) {
      if (this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
        this.attackPhase = 1;
        this.attackT = 0;
        ctx.sound('fireball_fly', this.pos, { pitch: 1.6, volume: 1.2 });
      }
      return true;
    }
    if (this.attackPhase === 1) {
      this.puffT -= dt;
      while (this.puffT <= 0) {
        this.puffT += 0.07;
        const from = this.muzzle(1.4, 0.3);
        const a = this.yaw + rand(-0.32, 0.32);
        const dir = new Vector3(Math.sin(a), rand(-0.08, 0.05), Math.cos(a));
        ctx.projectiles.fireball(from, dir, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, {
          speed: rand(11, 14), sprite: 'flame', scale: 1.6, color: new Color3(0.3, 1, 0.7), life: 0.62, quiet: true, hit: { source: this, piercing: true },
        });
      }
      if (this.attackT > 1.3) {
        this.attackPhase = 2;
        this.attackT = 0;
      }
      return true;
    }
    if (this.attackT > 0.4) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.attackPhase === 1) return 'hellflamer_atk1';
    return 'hellflamer_atk0';
  }
}

/**
 * Soul Terminator — heavy armor, slow. Long streams of heavy fire at range; up close a huge
 * power-sword swing that glows BLUE during the wind-up: parry it (F) or eat it.
 */
export class SoulTerminator extends HereticMarine {
  readonly kind = 'terminator' as const;
  private melee = false;
  private fireT = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('terminator', x, z, angle, hpMul);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (dist < this.def.meleeRange + ctx.player.radius) {
      this.melee = true;
      this.setState('attack');
      ctx.sound('chainsword_idle', this.pos, { pitch: 0.7, volume: 0.7 });
      return true;
    }
    if (!los || this.attackCD > 0 || dist > this.def.rangedRange) return false;
    this.melee = false;
    this.setState('attack');
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    if (this.melee) {
      if (this.attackPhase === 0) {
        this.face(ctx);
        this.parryTell = 0.1;
        if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
          this.attackPhase = 1;
          this.attackT = 0;
          ctx.sound('chainsword_hit', this.pos, { pitch: 0.6, volume: 1.2 });
          ctx.shake.add(0.4);
          if (dist < this.def.meleeRange + p.radius + 0.5)
            ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee', { source: this, parriable: true });
        }
        return true;
      }
      if (this.attackT > 0.6) {
        this.attackCD = Math.max(this.attackCD, 0.5);
        return false;
      }
      return true;
    }
    this.face(ctx);
    if (this.attackPhase === 0) {
      if (this.attackT >= this.def.rangedWindup) {
        this.attackPhase = 1;
        this.attackT = 0;
      }
      return true;
    }
    if (this.attackPhase === 1) {
      // sustained heavy fire
      this.fireT -= dt;
      while (this.fireT <= 0) {
        this.fireT += 0.085;
        const from = this.muzzle(1.25, -0.6);
        ctx.projectiles.fireball(from, this.aimAt(ctx, from, 0.06), this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, {
          speed: 34, sprite: 'hbolt', scale: 0.8, color: new Color3(1, 0.6, 0.2), quiet: true,
        });
        ctx.sound('pistol_fire', this.pos, { pitch: 0.45, volume: 0.6 });
      }
      if (this.attackT > 2.2 || dist < this.def.meleeRange) {
        this.attackPhase = 2;
        this.attackT = 0;
      }
      return true;
    }
    if (this.attackT > 0.5) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.melee) return this.attackPhase === 0 ? 'terminator_atk0' : 'terminator_atk1';
    return this.attackPhase === 1 ? 'terminator_cast' : 'terminator_idle';
  }
}
