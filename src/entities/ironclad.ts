import { Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { DamageKind, GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/** Armored husk: slow, relentless, clubs at close range. Bullets spark off the plating. */
export class Ironclad extends Enemy {
  readonly kind = 'ironclad' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_snarl', pain: 'zombie_pain', death: 'pinky_death', idle: 'pinky_snarl', pitch: 0.72 };
  private sparkT = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('ironclad', x, z, angle, hpMul);
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    if (this.alive && (kind === 'bullet' || kind === 'pellet') && ctx.time - this.sparkT > 0.06) {
      this.sparkT = ctx.time;
      const p = new Vector3(this.pos.x - dir.x * this.radius, this.pos.y + this.height * rand(0.45, 0.85), this.pos.z - dir.z * this.radius);
      ctx.particles.emit('sparks', p, dir.scale(-1), 7, 0.9);
      ctx.sound('impact_metal', p, { volume: 0.7, pitch: rand(0.8, 1.1) });
    }
    super.damage(amount, dir, kind, ctx);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los || dist > this.def.meleeRange + ctx.player.radius) return false;
    this.setState('attack');
    ctx.sound('pinky_snarl', this.pos, { pitch: 0.6, volume: 0.8 });
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    if (this.attackPhase === 0) {
      this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
        this.attackPhase = 1;
        this.attackT = 0;
        ctx.sound('chainsword_hit', this.pos, { pitch: 0.5, volume: 0.7 });
        if (dist < this.def.meleeRange + p.radius + 0.4) {
          ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee');
          ctx.shake.add(0.35);
        }
      }
      return true;
    }
    if (this.attackT > 0.45) {
      this.attackCD = 0.4;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    return this.attackPhase === 0 ? 'ironclad_atk0' : 'ironclad_atk1';
  }
}
