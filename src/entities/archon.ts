import { Color3, Vector3 } from '@babylonjs/core';
import type { EnemyKind } from '../core/config';
import { rand } from '../core/util';
import type { DamageKind, GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

type Move = 'volley' | 'blade' | 'sigils' | 'orbs' | 'leap' | 'summon';

/**
 * The Archon — final boss of Chapter 6. A test of everything the marine has learned:
 *  - volley: a wide fan of hellbolts — strafe, dash
 *  - blade: a great sweep. BLUE = parry it (F) for a Gun Strike (E); RED = unblockable, JUMP over it
 *  - sigils: burning rings erupt under you — dash out
 *  - phase 2 (2/3 health): calls the late-war host; while they live he is untouchable — pick targets
 *  - phase 3 (1/3 health): enraged — homing soul orbs and a leaping slam (red ring): jump as it lands
 */
export class Archon extends Enemy {
  readonly kind = 'archon' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_snarl', pain: 'pinky_pain', death: 'pinky_death', idle: 'pinky_snarl', pitch: 0.4 };
  private move: Move = 'volley';
  private turn = 0;
  private phase = 1;
  private parriable = false;
  private bound: Enemy[] = [];
  private leapTarget = new Vector3();
  private tauntT = 6;
  onPhase: ((phase: number) => void) | null = null;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('archon', x, z, angle, hpMul);
  }

  get isBound(): boolean {
    this.bound = this.bound.filter((e) => e.alive);
    return this.bound.length > 0;
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    if (!this.alive) return;
    if (this.isBound) {
      ctx.particles.emit('sparks', this.eye, dir.scale(-1), 8, 0.8);
      ctx.sound('impact_metal', this.pos, { pitch: 0.35, volume: 0.6 });
      return;
    }
    super.damage(amount, dir, kind, ctx);
  }

  private get rage(): number {
    return this.phase === 3 ? 0.6 : 1;
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    this.tauntT -= 1 / 60;
    if (this.tauntT <= 0) {
      this.tauntT = rand(16, 24);
      ctx.taunt(['a_taunt1', 'a_taunt2', 'a_taunt3'][Math.floor(Math.random() * 3)]);
    }
    if (this.phase === 1 && this.hp < this.maxHp * 0.66) {
      this.phase = 2;
      this.onPhase?.(2);
      return this.start('summon', ctx);
    }
    if (this.phase === 2 && this.hp < this.maxHp * 0.33) {
      this.phase = 3;
      this.onPhase?.(3);
      return this.start('summon', ctx);
    }
    if (dist < this.def.meleeRange + ctx.player.radius) return this.start('blade', ctx);
    if (!los || this.attackCD > 0) return false;
    this.turn++;
    const cycle: Move[] = this.phase === 1 ? ['volley', 'sigils', 'volley', 'blade'] : this.phase === 2 ? ['volley', 'sigils', 'orbs', 'volley'] : ['leap', 'orbs', 'volley', 'sigils', 'leap', 'volley'];
    const m = cycle[this.turn % cycle.length];
    if (m === 'blade' && dist > 12) return this.start('volley', ctx);
    return this.start(m, ctx);
  }

  private start(m: Move, ctx: GameCtx): boolean {
    this.move = m;
    this.setState('attack');
    if (m === 'blade') {
      this.parriable = Math.random() < 0.55;
      ctx.sound('chainsword_swing', this.pos, { pitch: 0.45, volume: 1.3 });
    } else if (m === 'summon') {
      ctx.sound('teleport', this.pos, { pitch: 0.35, volume: 1.5 });
      ctx.shake.add(0.5);
    } else if (m === 'leap') {
      ctx.sound('pinky_charge', this.pos, { pitch: 0.4, volume: 1.4 });
    } else ctx.sound('fireball_cast', this.pos, { pitch: 0.45, volume: 1.2 });
    const hand = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 3.4, this.pos.z) : null);
    ctx.lights.addFx(this.pos, m === 'blade' && !this.parriable ? new Color3(1, 0.15, 0.1) : new Color3(1, 0.6, 0.2), 3, 12, undefined, hand);
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const face = () => {
      this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    };
    switch (this.move) {
      case 'volley': {
        face();
        const shots = this.phase === 3 ? 3 : 2;
        if (this.attackPhase < shots && this.attackT >= (this.attackPhase === 0 ? 0.55 : 0.4) * this.rage) {
          this.attackPhase++;
          this.attackT = 0;
          const n = 7;
          const off = this.attackPhase % 2 ? 0 : 0.09;
          for (let i = 0; i < n; i++) {
            const a = this.yaw + (i - (n - 1) / 2) * 0.18 + off;
            const from = new Vector3(this.pos.x, this.pos.y + 2.6, this.pos.z);
            const ty = (p.pos.y + 1 - from.y) / Math.max(4, dist);
            ctx.projectiles.fireball(from, new Vector3(Math.sin(a), ty, Math.cos(a)).normalize(), this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, {
              speed: 19, sprite: 'bolt', scale: 1.2, color: new Color3(1, 0.6, 0.2), quiet: i !== 3,
            });
          }
          ctx.sound('fireball_cast', this.pos, { pitch: 0.7, volume: 1 });
        }
        if (this.attackPhase >= shots && this.attackT > 0.4) return this.finish(ctx);
        return true;
      }
      case 'blade': {
        if (this.attackPhase === 0) {
          face();
          if (this.parriable) this.parryTell = 0.1;
          else this.dangerTell = 0.1;
          if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
            this.attackPhase = 1;
            this.attackT = 0;
            ctx.sound('chainsword_hit', this.pos, { pitch: 0.5, volume: 1.4 });
            ctx.shake.add(0.5);
            const inReach = dist < this.def.meleeRange + p.radius + 0.6;
            // the red sweep is low: a jump clears it
            const jumped = !this.parriable && p.pos.y > this.pos.y + 0.7;
            if (inReach && !jumped)
              ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee', { source: this, parriable: this.parriable, unblockable: !this.parriable });
            ctx.particles.emit('sparks', this.pos.add(new Vector3(Math.sin(this.yaw) * 3, 0.5, Math.cos(this.yaw) * 3)), new Vector3(0, 1, 0), 20, 1.6);
          }
          return true;
        }
        return this.attackT > 0.5 ? this.finish(ctx, 0.4) : true;
      }
      case 'sigils': {
        face();
        if (this.attackPhase === 0 && this.attackT >= 0.6 * this.rage) {
          this.attackPhase = 1;
          const n = this.phase === 1 ? 3 : 5;
          for (let i = 0; i < n; i++) {
            const a = rand(0, Math.PI * 2), r = i === 0 ? 0 : rand(2.5, 6);
            ctx.hazard(new Vector3(p.pos.x + Math.sin(a) * r, p.pos.y, p.pos.z + Math.cos(a) * r), 1.1 + i * 0.12, 2.4, 22 * ctx.diff.enemyDamage);
          }
        }
        return this.attackPhase === 1 && this.attackT > 1.0 ? this.finish(ctx) : true;
      }
      case 'orbs': {
        face();
        if (this.attackPhase === 0 && this.attackT >= 0.6) {
          this.attackPhase = 1;
          for (let i = -1; i <= 1; i++) {
            const a = this.yaw + i * 0.7;
            ctx.projectiles.fireball(new Vector3(this.pos.x, this.pos.y + 3, this.pos.z), new Vector3(Math.sin(a), 0.3, Math.cos(a)), this, 16 * ctx.diff.enemyDamage, ctx, {
              speed: 8, sprite: 'orb', scale: 1.6, color: new Color3(1, 0.5, 0.2), homing: 1.6, life: 7,
            });
          }
        }
        return this.attackPhase === 1 && this.attackT > 0.6 ? this.finish(ctx) : true;
      }
      case 'leap': {
        if (this.attackPhase === 0) {
          face();
          this.dangerTell = 0.1;
          if (this.attackT >= 0.5) {
            this.attackPhase = 1;
            this.attackT = 0;
            this.leapTarget.set(p.pos.x, p.pos.y, p.pos.z);
            this.vy = 13;
            this.pos.y += 0.1;
            // the landing zone burns red; leave it or be in the air when he lands
            ctx.hazard(this.leapTarget.clone(), 1.35, 5.5, 34 * ctx.diff.enemyDamage);
            ctx.sound('barrel_explode', this.pos, { pitch: 0.5, volume: 0.9 });
          }
          return true;
        }
        if (this.attackPhase === 1) {
          const to = new Vector3(this.leapTarget.x - this.pos.x, 0, this.leapTarget.z - this.pos.z);
          const d = to.length();
          if (d > 0.3) ctx.world.move(this, (to.x / d) * Math.min(d, 14 * dt), (to.z / d) * Math.min(d, 14 * dt), 0.6);
          if (this.attackT > 1.35) {
            this.attackPhase = 2;
            this.attackT = 0;
            ctx.shake.add(0.9);
          }
          return true;
        }
        return this.attackT > 0.7 ? this.finish(ctx) : true;
      }
      case 'summon': {
        if (this.attackPhase === 0 && this.attackT >= 1.0) {
          this.attackPhase = 1;
          const host: EnemyKind[] = this.phase === 2 ? ['harrier', 'harrier', 'bulwark', 'hellflamer'] : ['harrier', 'harrier', 'harrier', 'bulwark', 'boltgunner'];
          host.forEach((k, i) => {
            const a = (i / host.length) * Math.PI * 2 + rand(-0.3, 0.3);
            const e = ctx.summon(k, this.pos.x + Math.sin(a) * 8, this.pos.z + Math.cos(a) * 8, { hpMul: this.hpMul * 0.8 });
            if (e) this.bound.push(e);
          });
          ctx.taunt(this.phase === 2 ? 'a_phase2' : 'a_phase3');
        }
        return this.attackPhase === 1 && this.attackT > 1.2 ? this.finish(ctx, 0.5) : true;
      }
    }
    return false;
  }

  private finish(ctx: GameCtx, cd?: number): boolean {
    this.attackCD = (cd ?? rand(...this.def.rangedCooldown) / ctx.diff.aggression) * this.rage;
    return false;
  }

  chaseSpeed(): number {
    return this.def.speed * (this.phase === 3 ? 1.35 : 1);
  }

  attackFrame(): string {
    if (this.move === 'blade') return this.attackPhase === 0 ? 'archon_atk0' : 'archon_atk1';
    if (this.move === 'leap') return this.attackPhase === 1 ? 'archon_atk0' : 'archon_cast';
    return 'archon_cast';
  }
}
