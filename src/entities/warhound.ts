import { Color3, Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

type Move = 'pounce' | 'bite' | 'breath';

/**
 * Siege-mode alpha: a two-headed hellhound that hunts alone every fifth round.
 *  - pounce: crouches (telegraph), then leaps at where you are standing
 *  - bite: both heads snap in quick succession up close
 *  - breath: both heads rear back, then sweep a fan of fire
 * Below 40% health it gets faster and pounces more often.
 */
export class Warhound extends Enemy {
  readonly kind = 'warhound' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_snarl', pain: 'pinky_pain', death: 'pinky_death', idle: 'pinky_snarl', pitch: 0.7 };
  private move: Move = 'bite';
  private pounceCD = rand(1.5, 3);
  private leapDir = new Vector3();
  private leapHit = false;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('warhound', x, z, angle, hpMul);
  }

  private get enraged(): boolean {
    return this.hp < this.maxHp * 0.4;
  }

  chaseSpeed(): number {
    return this.def.speed * (this.enraged ? 1.3 : 1);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    this.pounceCD -= 1 / 60;
    const p = ctx.player;
    if (dist < this.def.meleeRange + p.radius) return this.start('bite', ctx);
    if (!los) return false;
    if (this.pounceCD <= 0 && dist > 5 && dist < 20) return this.start('pounce', ctx);
    if (this.attackCD <= 0 && dist < this.def.rangedRange) return this.start('breath', ctx);
    return false;
  }

  private start(m: Move, ctx: GameCtx): boolean {
    this.move = m;
    this.setState('attack');
    if (m === 'pounce') ctx.sound('pinky_charge', this.pos, { pitch: 0.75 });
    else if (m === 'breath') {
      ctx.sound('fireball_cast', this.pos, { pitch: 0.6, volume: 1.2 });
      const mouth = () => (this.state === 'attack' && this.move === 'breath' ? new Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z) : null);
      ctx.lights.addFx(this.pos, new Color3(1, 0.45, 0.1), 2.4, 8, undefined, mouth);
    } else ctx.sound('pinky_snarl', this.pos, { pitch: 0.8 });
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const to = new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    const speed = this.enraged ? 1.25 : 1;
    switch (this.move) {
      case 'bite': {
        if (this.attackPhase === 0) this.yaw = Math.atan2(to.x, to.z);
        // two snaps: one per head
        const times = [0.32 / speed, 0.55 / speed];
        if (this.attackPhase < 2 && this.attackT >= times[this.attackPhase]) {
          this.attackPhase++;
          ctx.sound('pinky_bite', this.pos, { pitch: this.attackPhase === 1 ? 0.8 : 0.95 });
          if (dist < this.def.meleeRange + p.radius + 0.5) {
            ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee');
            ctx.shake.add(0.25);
          }
        }
        if (this.attackPhase >= 2 && this.attackT > 0.8 / speed) {
          this.attackCD = Math.min(this.attackCD, 0.4);
          return false;
        }
        return true;
      }
      case 'pounce': {
        if (this.attackPhase === 0) {
          this.yaw = Math.atan2(to.x, to.z);
          if (this.attackT >= 0.6 / speed) {
            this.attackPhase = 1;
            this.attackT = 0;
            this.leapHit = false;
            this.leapDir.copyFrom(to.normalize());
            this.vy = 5.5;
            this.pos.y += 0.05; // leave the ground so gravity takes over
            ctx.sound('pinky_charge', this.pos, { pitch: 0.6, volume: 1.2 });
          }
          return true;
        }
        const before = this.pos.clone();
        ctx.world.move(this, this.leapDir.x * 17 * dt, this.leapDir.z * 17 * dt, 1.2);
        this.animT += dt * 2;
        if (!this.leapHit && dist < this.radius + p.radius + 0.6) {
          this.leapHit = true;
          ctx.damagePlayer(rand(26, 36) * ctx.diff.enemyDamage, this.pos, 'melee');
          ctx.pushPlayer(this.leapDir.scale(10));
          ctx.shake.add(0.5);
          ctx.sound('pinky_bite', this.pos, { pitch: 0.7 });
        }
        const stuck = Math.hypot(this.pos.x - before.x, this.pos.z - before.z) < 17 * dt * 0.3;
        if (this.attackT > 0.7 || stuck) {
          ctx.particles.emit('dust', this.pos.add(new Vector3(0, 0.2, 0)), new Vector3(0, 1, 0), 16, 1.4);
          this.pounceCD = rand(3, 5) / (this.enraged ? 1.6 : 1) / ctx.diff.aggression;
          return false;
        }
        return true;
      }
      case 'breath': {
        this.yaw = Math.atan2(to.x, to.z);
        if (this.attackPhase === 0 && this.attackT >= 0.5 / speed) {
          this.attackPhase = 1;
          this.attackT = 0;
        }
        if (this.attackPhase >= 1 && this.attackPhase <= 6 && this.attackT >= (this.attackPhase - 1) * 0.09) {
          // alternate heads, sweeping across the player
          const head = this.attackPhase % 2 === 0 ? 1 : -1;
          const side = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
          const from = new Vector3(this.pos.x, this.pos.y + 1.3, this.pos.z).add(side.scale(head * 0.8));
          const target = new Vector3(p.pos.x, p.pos.y + 0.9, p.pos.z);
          const base = target.subtract(from).normalize();
          const yaw = Math.atan2(base.x, base.z) + (this.attackPhase - 3.5) * 0.07;
          const horiz = Math.hypot(base.x, base.z);
          const d = new Vector3(Math.sin(yaw) * horiz, base.y, Math.cos(yaw) * horiz);
          ctx.projectiles.fireball(from.add(d.scale(this.radius)), d, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, { speed: 15 });
          this.attackPhase++;
        }
        if (this.attackPhase > 6 && this.attackT > 0.8) {
          this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression / speed;
          return false;
        }
        return true;
      }
    }
    return false;
  }

  attackFrame(): string {
    if (this.move === 'pounce') return this.attackPhase === 0 ? 'warhound_atk0' : `warhound_walk${Math.floor(this.animT * 12) % 4}`;
    if (this.move === 'breath') return 'warhound_cast';
    return 'warhound_atk1';
  }
}
