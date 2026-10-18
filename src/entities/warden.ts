import { Color3, Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/**
 * Chapter 2 boss. Fireball fan from range, ground slam up close,
 * calls imps at 66% / 33% health and enrages below half.
 */
export class Warden extends Enemy {
  readonly kind = 'warden' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_charge', pain: 'pinky_pain', death: 'pinky_death', idle: 'imp_growl', pitch: 0.55 };
  private mode: 'volley' | 'slam' = 'volley';
  private summoned = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('warden', x, z, angle, hpMul);
  }

  private get enraged(): boolean {
    return this.hp < this.maxHp * 0.5;
  }

  chaseSpeed(): number {
    return this.def.speed * (this.enraged ? 1.45 : 1);
  }

  private checkSummon(ctx: GameCtx): void {
    const frac = this.hp / this.maxHp;
    const want = frac < 0.33 ? 2 : frac < 0.66 ? 1 : 0;
    while (this.summoned < want) {
      this.summoned++;
      ctx.sound('teleport', this.pos, { volume: 1.2 });
      for (let i = 0; i < 3; i++) {
        const a = this.yaw + Math.PI + (i - 1) * 1.1;
        ctx.summon('imp', this.pos.x + Math.sin(a) * 4.5, this.pos.z + Math.cos(a) * 4.5);
      }
    }
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    this.checkSummon(ctx);
    if (dist < this.def.meleeRange) {
      this.mode = 'slam';
      this.setState('attack');
      ctx.sound('pinky_charge', this.pos, { pitch: 0.5 });
      return true;
    }
    if (!los || this.attackCD > 0 || dist > this.def.rangedRange) return false;
    this.mode = 'volley';
    this.setState('attack');
    ctx.sound('fireball_cast', this.pos, { pitch: 0.7, volume: 1.3 });
    const hand = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 3, this.pos.z) : null);
    ctx.lights.addFx(this.pos, new Color3(1, 0.45, 0.1), 2.6, 9, undefined, hand);
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const speed = this.enraged ? 1.3 : 1;
    if (this.attackPhase === 0) this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (this.mode === 'slam') {
      if (this.attackPhase === 0 && this.attackT >= this.def.meleeWindup / speed) {
        this.attackPhase = 1;
        this.attackT = 0;
        ctx.sound('barrel_explode', this.pos, { pitch: 0.6, volume: 0.9 });
        ctx.shake.add(0.8);
        ctx.particles.emit('dust', this.pos.add(new Vector3(0, 0.2, 0)), new Vector3(0, 1, 0), 30, 2.5);
        ctx.particles.emit('fire', this.pos.add(new Vector3(0, 0.3, 0)), new Vector3(0, 1, 0), 20, 2.2);
        ctx.lights.addFx(this.pos, new Color3(1, 0.5, 0.2), 4, 12, 0.4);
        if (dist < this.def.meleeRange + 0.8) ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'blast');
      }
      if (this.attackPhase === 1 && this.attackT > 0.7) {
        this.attackCD = Math.min(this.attackCD, 0.6);
        return false;
      }
      return true;
    }
    if (this.attackPhase === 0 && this.attackT >= this.def.rangedWindup / speed) {
      this.attackPhase = 1;
      this.attackT = 0;
      const from = new Vector3(this.pos.x, this.pos.y + 2.4, this.pos.z);
      const target = new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z);
      const base = target.subtract(from).normalize();
      const n = this.enraged ? 7 : 5;
      const yaw = Math.atan2(base.x, base.z);
      const horiz = Math.hypot(base.x, base.z);
      for (let i = 0; i < n; i++) {
        const a = yaw + (i - (n - 1) / 2) * 0.16;
        const d = new Vector3(Math.sin(a) * horiz, base.y, Math.cos(a) * horiz);
        ctx.projectiles.fireball(from.add(d.scale(this.radius + 0.4)), d, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, { speed: 13 });
      }
    }
    if (this.attackPhase === 1 && this.attackT > 0.45) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression / speed;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.mode === 'slam') return this.attackPhase === 0 ? 'warden_atk0' : 'warden_atk1';
    return this.attackPhase === 0 ? 'warden_cast' : 'warden_atk1';
  }
}
