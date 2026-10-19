import { Color3, Vector3 } from '@babylonjs/core';
import { HELLBOLT } from '../core/config';
import { angleDiff, rand } from '../core/util';
import type { SoundHandle } from '../audio/audioManager';
import type { DamageKind, GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/**
 * Chapter 3 heavy. Every attack has a long, readable wind-up:
 * the blade glows and rises before a cone slam; the hand charges before a fast hellbolt.
 */
export class Executioner extends Enemy {
  readonly kind = 'executioner' as const;
  readonly sounds: EnemySounds = { alert: 'imp_alert', pain: 'pinky_pain', death: 'imp_death', idle: 'imp_growl', pitch: 0.62 };
  private melee = false;
  private rev: SoundHandle | null = null;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('executioner', x, z, angle, hpMul);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los) return false;
    if (dist < this.def.meleeRange) {
      this.melee = true;
      this.setState('attack');
      this.rev?.stop(0.05);
      this.rev = ctx.sound('chainsword_idle', this.pos, { pitch: 0.45, volume: 0.9 });
      const blade = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 2.8, this.pos.z) : null);
      ctx.lights.addFx(this.pos, new Color3(1, 0.2, 0.1), 2.2, 7, undefined, blade);
      return true;
    }
    if (this.attackCD > 0 || dist > this.def.rangedRange) return false;
    this.melee = false;
    this.setState('attack');
    ctx.sound('fireball_cast', this.pos, { pitch: 0.55 });
    const hand = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 1.9, this.pos.z) : null);
    ctx.lights.addFx(this.pos, new Color3(0.7, 0.3, 1), 2, 7, undefined, hand);
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const want = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (this.melee) {
      if (this.attackPhase === 0) {
        // tracks slowly during the wind-up, so a late sidestep works
        this.yaw += Math.max(-1.6 * dt, Math.min(1.6 * dt, angleDiff(this.yaw, want)));
        if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
          this.attackPhase = 1;
          this.attackT = 0;
          this.stopRev();
          ctx.sound('chainsword_hit', this.pos, { pitch: 0.45 });
          ctx.shake.add(0.5);
          const hit = this.pos.add(new Vector3(Math.sin(this.yaw) * 2, 0.2, Math.cos(this.yaw) * 2));
          ctx.particles.emit('sparks', hit, new Vector3(0, 1, 0), 18, 1.5);
          ctx.particles.emit('dust', hit, new Vector3(0, 1, 0), 14, 1.5);
          const off = Math.abs(angleDiff(this.yaw, want));
          if (dist < this.def.meleeRange + p.radius + 0.3 && off < 0.6) {
            ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee');
          }
        }
        return true;
      }
      if (this.attackT > 0.8) {
        this.attackCD = Math.max(this.attackCD, 0.8);
        return false;
      }
      return true;
    }
    if (this.attackPhase === 0) {
      this.yaw = want;
      if (this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
        this.attackPhase = 1;
        this.attackT = 0;
        const from = new Vector3(this.pos.x, this.pos.y + 1.8, this.pos.z);
        const dir = new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z).subtract(from).normalize();
        from.addInPlace(dir.scale(this.radius + 0.4));
        ctx.projectiles.fireball(from, dir, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, { speed: HELLBOLT.speed, bolt: true });
      }
      return true;
    }
    if (this.attackT > 0.4) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  private stopRev(): void {
    this.rev?.stop(0.08);
    this.rev = null;
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    super.damage(amount, dir, kind, ctx);
    // death or a pain flinch cancels the wind-up
    if (!this.alive || this.state === 'pain') this.stopRev();
  }

  attackFrame(): string {
    if (this.melee) return this.attackPhase === 0 ? 'executioner_atk0' : 'executioner_atk1';
    return this.attackPhase === 0 ? 'executioner_cast' : 'executioner_atk1';
  }
}
