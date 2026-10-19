import { Color3, Vector3 } from '@babylonjs/core';
import { HELLBOLT, type EnemyKind } from '../core/config';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

type Move = 'volley' | 'erupt' | 'slam' | 'summon';

/**
 * Final boss. Every move is telegraphed:
 *  - volley: hands raised (cast), then a spread of hellbolts
 *  - erupt: arms up, the ground under and around the player glows, then bursts
 *  - slam: up close, a long overhead wind-up and a shockwave
 *  - summon: at 75% / 50% / 25% health it calls its court
 * Below half health it moves and casts faster and the eruptions multiply.
 */
export class Sovereign extends Enemy {
  readonly kind = 'sovereign' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_charge', pain: 'pinky_pain', death: 'pinky_death', idle: 'imp_growl', pitch: 0.45 };
  private move: Move = 'volley';
  private summoned = 0;
  private turn = 0;
  /** Fired once when the second phase starts (level scripting hooks it for a radio line). */
  onPhase2: (() => void) | null = null;
  private phase2 = false;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('sovereign', x, z, angle, hpMul);
  }

  private get enraged(): boolean {
    return this.hp < this.maxHp * 0.5;
  }

  chaseSpeed(): number {
    return this.def.speed * (this.enraged ? 1.5 : 1);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (this.enraged && !this.phase2) {
      this.phase2 = true;
      ctx.shake.add(0.8);
      ctx.sound('pinky_charge', this.pos, { pitch: 0.35, volume: 1.4 });
      this.onPhase2?.();
    }
    const frac = this.hp / this.maxHp;
    const want = frac < 0.25 ? 3 : frac < 0.5 ? 2 : frac < 0.75 ? 1 : 0;
    if (this.summoned < want) {
      this.summoned = want;
      this.start('summon', ctx);
      return true;
    }
    if (dist < this.def.meleeRange) {
      this.start('slam', ctx);
      return true;
    }
    if (!los || this.attackCD > 0) return false;
    this.turn++;
    this.start(this.turn % 3 === 0 ? 'erupt' : 'volley', ctx);
    return true;
  }

  private start(m: Move, ctx: GameCtx): void {
    this.move = m;
    this.setState('attack');
    const hand = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 3.4, this.pos.z) : null);
    if (m === 'slam') ctx.sound('pinky_charge', this.pos, { pitch: 0.4 });
    else ctx.sound('fireball_cast', this.pos, { pitch: 0.45, volume: 1.4 });
    const col = m === 'volley' ? new Color3(1, 0.25, 0.5) : m === 'erupt' ? new Color3(1, 0.45, 0.1) : new Color3(1, 0.2, 0.2);
    ctx.lights.addFx(this.pos, col, 3, 12, undefined, hand);
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const speed = this.enraged ? 1.35 : 1;
    if (this.attackPhase === 0) this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    switch (this.move) {
      case 'slam':
        if (this.attackPhase === 0 && this.attackT >= this.def.meleeWindup / speed) {
          this.attackPhase = 1;
          this.attackT = 0;
          ctx.sound('barrel_explode', this.pos, { pitch: 0.5 });
          ctx.shake.add(0.9);
          ctx.particles.emit('fire', this.pos.add(new Vector3(0, 0.3, 0)), new Vector3(0, 1, 0), 40, 3);
          ctx.lights.addFx(this.pos, new Color3(1, 0.4, 0.2), 5, 16, 0.4);
          if (dist < this.def.meleeRange + 1) {
            ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'blast');
            ctx.pushPlayer(new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize().scale(14));
          }
        }
        if (this.attackPhase === 1 && this.attackT > 0.7) {
          this.attackCD = Math.min(this.attackCD, 0.8);
          return false;
        }
        return true;
      case 'volley':
        if (this.attackPhase < 3 && this.attackT >= (this.attackPhase === 0 ? this.def.rangedWindup / speed : 0.28)) {
          // three salvos
          this.attackPhase++;
          this.attackT = 0;
          const from = new Vector3(this.pos.x, this.pos.y + 3.0, this.pos.z);
          const base = new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z).subtract(from).normalize();
          const yaw = Math.atan2(base.x, base.z);
          const horiz = Math.hypot(base.x, base.z);
          const n = this.enraged ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = yaw + (i - (n - 1) / 2) * 0.14 + (this.attackPhase % 2 ? 0.07 : -0.07);
            const d = new Vector3(Math.sin(a) * horiz, base.y, Math.cos(a) * horiz);
            ctx.projectiles.fireball(from.add(d.scale(this.radius + 0.5)), d, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, { speed: HELLBOLT.speed * 0.8, bolt: true });
          }
        }
        if (this.attackPhase >= 3 && this.attackT > 0.4) {
          this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression / speed;
          return false;
        }
        return true;
      case 'erupt':
        if (this.attackPhase === 0 && this.attackT >= 0.6 / speed) {
          this.attackPhase = 1;
          this.attackT = 0;
          const n = this.enraged ? 6 : 3;
          const lead = p.vel.scale(0.6);
          ctx.hazard(new Vector3(p.pos.x + lead.x, 0, p.pos.z + lead.z), 1.15, 2.4, 26 * ctx.diff.enemyDamage);
          for (let i = 1; i < n; i++) {
            const a = rand(0, Math.PI * 2), r = rand(3, 7);
            ctx.hazard(new Vector3(p.pos.x + Math.sin(a) * r, 0, p.pos.z + Math.cos(a) * r), 1.15 + i * 0.12, 2.4, 26 * ctx.diff.enemyDamage);
          }
        }
        if (this.attackPhase === 1 && this.attackT > 0.6) {
          this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression / speed;
          return false;
        }
        return true;
      case 'summon':
        if (this.attackPhase === 0 && this.attackT >= 1.0) {
          this.attackPhase = 1;
          this.attackT = 0;
          const court: EnemyKind[] = this.summoned === 1 ? ['wraith', 'wraith', 'imp'] : this.summoned === 2 ? ['executioner', 'wraith', 'wraith'] : ['ironclad', 'wraith', 'executioner', 'imp'];
          court.forEach((k, i) => {
            const a = this.yaw + Math.PI + (i - (court.length - 1) / 2) * 0.9;
            ctx.summon(k, this.pos.x + Math.sin(a) * 6, this.pos.z + Math.cos(a) * 6);
          });
          ctx.shake.add(0.5);
        }
        return !(this.attackPhase === 1 && this.attackT > 0.5);
    }
    return false;
  }

  attackFrame(): string {
    if (this.move === 'slam') return this.attackPhase === 0 ? 'sovereign_atk0' : 'sovereign_atk1';
    if (this.move === 'erupt') return this.attackPhase === 0 ? 'sovereign_atk0' : 'sovereign_atk1';
    return this.attackPhase === 0 || this.move === 'summon' ? 'sovereign_cast' : 'sovereign_idle';
  }
}
