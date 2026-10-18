import { Color3, Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/** Spined demon: conjures a dodgeable fireball (glowing wind-up), claws at close range. */
export class Imp extends Enemy {
  readonly kind = 'imp' as const;
  readonly sounds: EnemySounds = { alert: 'imp_alert', pain: 'imp_pain', death: 'imp_death', idle: 'imp_growl' };
  private melee = false;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('imp', x, z, angle, hpMul);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los) return false;
    if (dist < this.def.meleeRange + ctx.player.radius) {
      this.setState('attack');
      this.melee = true;
      ctx.sound('imp_growl', this.pos, { volume: 0.8, pitch: 1.3 });
      return true;
    }
    if (this.attackCD > 0 || dist > this.def.rangedRange) return false;
    if (Math.random() > 0.5 + 0.2 * ctx.diff.aggression) {
      this.attackCD = 0.5;
      return false;
    }
    this.setState('attack');
    this.melee = false;
    ctx.sound('fireball_cast', this.pos);
    const hand = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 2.1, this.pos.z) : null);
    ctx.lights.addFx(this.pos, new Color3(1, 0.5, 0.12), 1.6, 6, undefined, hand);
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const to = new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    this.yaw = Math.atan2(to.x, to.z);
    if (this.melee) {
      if (this.attackPhase === 0 && this.attackT >= this.def.meleeWindup) {
        this.attackPhase = 1;
        this.attackT = 0;
        ctx.sound('imp_claw', this.pos);
        if (dist < this.def.meleeRange + p.radius + 0.4) ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee');
      }
      if (this.attackPhase === 1 && this.attackT > 0.3) {
        this.attackCD = rand(0.6, 1.2);
        return false;
      }
      return true;
    }
    if (this.attackPhase === 0 && this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
      this.attackPhase = 1;
      this.attackT = 0;
      const from = new Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z);
      const target = new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z);
      const dir = target.subtract(from).normalize();
      from.addInPlace(dir.scale(this.radius + 0.3));
      ctx.projectiles.fireball(from, dir, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx);
    }
    if (this.attackPhase === 1 && this.attackT > 0.3) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.melee) return 'imp_claw';
    return this.attackPhase === 0 ? 'imp_atk0' : 'imp_atk1';
  }
}
