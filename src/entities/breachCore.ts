import { Color3, Vector3 } from '@babylonjs/core';
import type { EnemyKind } from '../core/config';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

const DEFENDERS: EnemyKind[] = ['imp', 'imp', 'zombieman', 'pinky', 'executioner', 'imp', 'ironclad'];

/** The breach heart. Never moves; summons defenders and releases a shockwave when crowded. */
export class BreachCore extends Enemy {
  readonly kind = 'core' as const;
  readonly sounds: EnemySounds = { alert: 'teleport', pain: 'flesh_hit', death: 'barrel_explode', pitch: 0.5 };
  private summonT = 4;
  private summonIdx = 0;
  private pulse = false;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('core', x, z, angle, hpMul);
  }

  chaseSpeed(): number {
    return 0;
  }

  tryAttack(ctx: GameCtx, dist: number): boolean {
    this.summonT -= 1 / 60;
    if (dist < this.def.meleeRange) {
      this.pulse = true;
      this.setState('attack');
      ctx.sound('pinky_charge', this.pos, { pitch: 0.4, volume: 1.2 });
      const c = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 1.8, this.pos.z) : null);
      ctx.lights.addFx(this.pos, new Color3(1, 0.25, 0.5), 3, 10, undefined, c);
      return true;
    }
    if (this.summonT <= 0) {
      this.summonT = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      const alive = ctx.enemies.filter((e) => e.alive && e !== this && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < 36).length;
      if (alive >= 6) return false;
      this.pulse = false;
      this.setState('attack');
      ctx.sound('fireball_cast', this.pos, { pitch: 0.4, volume: 1.3 });
      return true;
    }
    return false;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    if (this.pulse) {
      if (this.attackPhase === 0 && this.attackT >= this.def.meleeWindup) {
        this.attackPhase = 1;
        this.attackT = 0;
        ctx.sound('barrel_explode', this.pos, { pitch: 0.5, volume: 1.1 });
        ctx.shake.add(0.7);
        ctx.particles.emit('teleport', this.pos.add(new Vector3(0, 1.5, 0)), new Vector3(0, 1, 0), 40, 3);
        ctx.lights.addFx(this.pos, new Color3(1, 0.3, 0.6), 5, 16, 0.45);
        if (dist < this.def.meleeRange + 0.5) {
          ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'blast');
          ctx.pushPlayer(new Vector3(ctx.player.pos.x - this.pos.x, 0, ctx.player.pos.z - this.pos.z).normalize().scale(16));
        }
      }
      if (this.attackPhase === 1 && this.attackT > 0.6) {
        this.summonT = Math.min(this.summonT, 3);
        return false;
      }
      return true;
    }
    if (this.attackPhase === 0 && this.attackT >= 0.9) {
      this.attackPhase = 1;
      this.attackT = 0;
      const n = this.hp < this.maxHp * 0.5 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const kind = DEFENDERS[this.summonIdx++ % DEFENDERS.length];
        const a = rand(0, Math.PI * 2);
        ctx.summon(kind, this.pos.x + Math.sin(a) * 9, this.pos.z + Math.cos(a) * 9);
      }
    }
    return !(this.attackPhase === 1 && this.attackT > 0.4);
  }

  attackFrame(): string {
    if (this.pulse) return this.attackPhase === 0 ? 'core_atk0' : 'core_atk1';
    return 'core_cast';
  }
}
