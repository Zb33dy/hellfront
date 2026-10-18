import { Vector3 } from '@babylonjs/core';
import { PINKY_CHARGE } from '../core/config';
import { angleDiff, rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/**
 * Brute charger. Phases: 0 = bite wind-up (jaws open), 1 = bite recover,
 * 2 = charge wind-up (snarl, stops), 3 = charging.
 */
export class Pinky extends Enemy {
  readonly kind = 'pinky' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_snarl', pain: 'pinky_pain', death: 'pinky_death', idle: 'pinky_snarl' };
  private chargeCD = rand(1, 2.5);
  private chargeDir = new Vector3();
  private charging = false;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('pinky', x, z, angle, hpMul);
  }

  chaseSpeed(): number {
    return this.charging ? PINKY_CHARGE.speed : this.def.speed;
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    this.chargeCD -= 1 / 60;
    if (dist < this.def.meleeRange + ctx.player.radius) {
      this.startBite(ctx);
      return true;
    }
    if (los && dist < PINKY_CHARGE.range && dist > 3.2 && this.chargeCD <= 0) {
      this.setState('attack');
      this.attackPhase = 2;
      ctx.sound('pinky_charge', this.pos);
      return true;
    }
    return false;
  }

  private startBite(ctx: GameCtx): void {
    this.setState('attack');
    this.attackPhase = 0;
    this.charging = false;
    void ctx;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const to = new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    switch (this.attackPhase) {
      case 0:
        this.yaw = Math.atan2(to.x, to.z);
        if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
          this.attackPhase = 1;
          this.attackT = 0;
          ctx.sound('pinky_bite', this.pos);
          if (dist < this.def.meleeRange + p.radius + 0.45) {
            ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee');
            ctx.shake.add(0.3);
          }
        }
        return true;
      case 1:
        if (this.attackT > 0.35) {
          this.attackCD = 0.3;
          return false;
        }
        return true;
      case 2:
        // telegraph: plant feet, then lunge
        this.yaw = Math.atan2(to.x, to.z);
        if (this.attackT >= PINKY_CHARGE.windup / Math.sqrt(ctx.diff.aggression)) {
          this.attackPhase = 3;
          this.attackT = 0;
          this.charging = true;
          this.chargeDir.copyFrom(to.normalize());
        }
        return true;
      case 3: {
        // steer slightly toward the player, but commit to the line (dodgeable)
        const want = Math.atan2(to.x, to.z);
        const cur = Math.atan2(this.chargeDir.x, this.chargeDir.z);
        const na = cur + Math.max(-1.4 * dt, Math.min(1.4 * dt, angleDiff(cur, want)));
        this.chargeDir.set(Math.sin(na), 0, Math.cos(na));
        this.yaw = na;
        const before = this.pos.clone();
        ctx.world.move(this, this.chargeDir.x * PINKY_CHARGE.speed * dt, this.chargeDir.z * PINKY_CHARGE.speed * dt, 0.62);
        const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
        this.animT += dt * 2;
        if (dist < this.def.meleeRange + p.radius) {
          this.charging = false;
          this.chargeCD = rand(...PINKY_CHARGE.cooldown);
          this.startBite(ctx);
          this.attackT = this.def.meleeWindup * 0.6; // charge momentum makes the bite quicker
          return true;
        }
        if (this.attackT > PINKY_CHARGE.duration || moved < PINKY_CHARGE.speed * dt * 0.3) {
          if (moved < PINKY_CHARGE.speed * dt * 0.3) ctx.shake.add(dist < 8 ? 0.15 : 0);
          this.charging = false;
          this.chargeCD = rand(...PINKY_CHARGE.cooldown);
          return false;
        }
        return true;
      }
    }
    return false;
  }

  attackFrame(): string {
    if (this.attackPhase === 3) return `pinky_walk${Math.floor(this.animT * 12) % 4}`;
    if (this.attackPhase === 1) return 'pinky_atk1';
    return 'pinky_atk0';
  }
}
