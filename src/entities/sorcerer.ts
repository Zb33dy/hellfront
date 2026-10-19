import { Color3, Vector3 } from '@babylonjs/core';
import { CELL, type EnemyKind } from '../core/config';
import { rand } from '../core/util';
import type { DamageKind, GameCtx } from '../scenes/context';
import { CellKind } from '../level/grid';
import { Enemy, type EnemySounds } from './enemy';

type Move = 'beam' | 'orbs' | 'staff' | 'shield' | 'summon' | 'raise';

const HOST: EnemyKind[] = ['boltgunner', 'hellflamer', 'boltgunner', 'terminator', 'hellflamer'];
const TAUNTS = ['s_taunt1', 's_taunt2', 's_taunt3', 's_taunt4', 's_taunt5'];

/**
 * The Sorcerer — Siege boss (every 15th round). A heretic-armored man with a skull staff.
 *  - beam: short charge with a RED telegraph line, then an unblockable energy beam — sidestep it
 *  - orbs: slow homing soul orbs that chase where you are; break line of sight or out-jump them
 *  - shield: a hell-shield bubble that eats all damage except rockets and sniper rounds
 *  - teleport: too much close pressure (melee, staggers, standing in his face) and he blinks away
 *  - staff: swings when you are close; BLUE swings can be parried (F) → Gun Strike (E)
 *  - summons Heretic Marines, and at low health raises the fallen ones: while they live, he is untouchable
 */
export class Sorcerer extends Enemy {
  readonly kind = 'sorcerer' as const;
  readonly sounds: EnemySounds = { alert: 'imp_alert', pain: 'imp_pain', death: 'imp_death', idle: 'imp_growl', pitch: 0.7 };
  private move: Move = 'orbs';
  private turn = 0;
  private beamDir = new Vector3();
  private beamFrom = new Vector3();
  private summonT = 6;
  private tauntT = 9;
  private shieldCD = 4;
  private pressure = 0;
  private parriable = false;
  private raised = false;
  private bound: Enemy[] = [];
  /** Hell shield hit points (0 = no shield). */
  shieldHp = 0;
  /** Beam visual for the renderer (null when idle). */
  beamFx: { from: Vector3; to: Vector3; red: boolean } | null = null;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('sorcerer', x, z, angle, hpMul);
  }

  /** Untouchable while resurrected heretics still stand. */
  get isBound(): boolean {
    this.bound = this.bound.filter((e) => e.alive);
    return this.bound.length > 0;
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    if (!this.alive) return;
    if (this.isBound) {
      ctx.particles.emit('sparks', this.eye, dir.scale(-1), 8, 0.8);
      ctx.sound('impact_metal', this.pos, { pitch: 0.4, volume: 0.6 });
      return;
    }
    if (this.shieldHp > 0) {
      // only rockets/explosions and heavy single rounds (sniper, gun strike) crack the shield
      if (kind === 'blast' || (kind === 'bullet' && amount >= 150)) {
        this.shieldHp -= amount;
        ctx.sound('impact_metal', this.pos, { pitch: 0.7, volume: 1 });
        if (this.shieldHp <= 0) {
          this.shieldHp = 0;
          this.shieldCD = 12;
          ctx.sound('barrel_explode', this.pos, { pitch: 1.6, volume: 1 });
          ctx.particles.emit('teleport', this.eye, new Vector3(0, 1, 0), 40, 2.2);
          ctx.shake.add(0.4);
        }
      } else {
        ctx.particles.emit('sparks', this.eye, dir.scale(-1), 6, 0.6);
      }
      return;
    }
    if (kind === 'saw' || kind === 'melee') this.pressure += amount * 0.03;
    super.damage(amount, dir, kind, ctx);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    const dt = 1 / 60;
    this.summonT -= dt;
    this.tauntT -= dt;
    this.shieldCD -= dt;
    if (dist < 4) this.pressure += dt * 0.6;
    if (this.staggerT > 0) this.pressure += dt * 2;
    this.pressure = Math.max(0, this.pressure - dt * 0.25);
    if (this.tauntT <= 0) {
      this.tauntT = rand(14, 20);
      ctx.taunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
    }
    // the resurrection (once, at low health)
    if (!this.raised && this.hp < this.maxHp * 0.35) return this.start('raise', ctx);
    if (this.pressure > 1.2) {
      this.blinkAway(ctx);
      return this.start('orbs', ctx);
    }
    if (this.summonT <= 0) {
      this.summonT = rand(22, 28);
      const host = ctx.enemies.filter((e) => e.alive && (e.kind === 'boltgunner' || e.kind === 'hellflamer' || e.kind === 'terminator')).length;
      if (host < 5) return this.start('summon', ctx);
    }
    if (this.shieldHp <= 0 && this.shieldCD <= 0) return this.start('shield', ctx);
    if (dist < this.def.meleeRange + ctx.player.radius) return this.start('staff', ctx);
    if (!los || this.attackCD > 0) return false;
    this.turn++;
    return this.start(this.turn % 2 ? 'beam' : 'orbs', ctx);
  }

  private start(m: Move, ctx: GameCtx): boolean {
    this.move = m;
    this.setState('attack');
    if (m === 'staff') {
      this.parriable = Math.random() < 0.55;
      ctx.sound('chainsword_swing', this.pos, { pitch: 0.6 });
    } else if (m === 'beam') {
      ctx.sound('fireball_cast', this.pos, { pitch: 0.4, volume: 1.4 });
    } else if (m === 'raise') {
      this.raised = true;
      ctx.taunt('s_raise');
      ctx.sound('teleport', this.pos, { pitch: 0.4, volume: 1.4 });
    } else if (m === 'shield') {
      ctx.taunt('s_shield');
      ctx.sound('teleport', this.pos, { pitch: 0.7 });
    } else {
      ctx.sound('fireball_cast', this.pos, { pitch: 0.55, volume: 1.1 });
    }
    const hand = () => (this.state === 'attack' && this.attackPhase === 0 ? new Vector3(this.pos.x, this.pos.y + 2.6, this.pos.z) : null);
    ctx.lights.addFx(this.pos, m === 'beam' ? new Color3(1, 0.15, 0.2) : new Color3(0.8, 0.3, 1), 2.6, 10, undefined, hand);
    return true;
  }

  private blinkAway(ctx: GameCtx): void {
    this.pressure = 0;
    const p = ctx.player;
    const g = ctx.world.grid;
    for (let tries = 0; tries < 20; tries++) {
      const x = rand(5, g.w - 5) * CELL, z = rand(5, g.h - 5) * CELL;
      const ci = g.cellAt(x, z);
      if (ci < 0 || g.isSolid(ci) || g.kind[ci] !== CellKind.Floor) continue;
      if (Math.hypot(x - p.pos.x, z - p.pos.z) < 16) continue;
      ctx.particles.emit('teleport', this.pos.add(new Vector3(0, 1.2, 0)), new Vector3(0, 1, 0), 40, 1.4);
      ctx.sound('teleport', this.pos, { pitch: 0.8 });
      this.pos.x = x;
      this.pos.z = z;
      this.pos.y = ctx.world.groundAt(x, z, this.radius, 10, 20);
      ctx.particles.emit('teleport', this.pos.add(new Vector3(0, 1.2, 0)), new Vector3(0, 1, 0), 40, 1.4);
      ctx.sound('teleport', this.pos, { pitch: 0.8 });
      this.staggerT = 0;
      return;
    }
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    const face = () => {
      this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    };
    switch (this.move) {
      case 'beam': {
        const charge = this.def.rangedWindup / Math.sqrt(ctx.diff.aggression);
        if (this.attackPhase === 0) {
          face();
          this.dangerTell = 0.1;
          this.beamFrom.set(this.pos.x, this.pos.y + 2.2, this.pos.z);
          // aim tracks you until the last 0.3 s, then locks — that is your window to sidestep
          if (this.attackT < charge - 0.3) this.beamDir.copyFrom(new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z).subtract(this.beamFrom).normalize());
          const end = ctx.world.raycast(this.beamFrom, this.beamDir, 80);
          this.beamFx = { from: this.beamFrom.clone(), to: end.kind === 'none' ? this.beamFrom.add(this.beamDir.scale(80)) : end.point, red: true };
          if (this.attackT >= charge) {
            this.attackPhase = 1;
            this.attackT = 0;
            ctx.sound('barrel_explode', this.pos, { pitch: 1.8, volume: 1.1 });
            ctx.shake.add(0.3);
            const to = this.beamFx.to;
            this.beamFx = { from: this.beamFrom.clone(), to, red: false };
            // hit test: distance from the player to the beam segment
            const seg = to.subtract(this.beamFrom);
            const L = seg.length();
            const u = seg.scale(1 / Math.max(L, 1e-4));
            const rel = p.pos.add(new Vector3(0, 1, 0)).subtract(this.beamFrom);
            const tt = Math.max(0, Math.min(L, Vector3.Dot(rel, u)));
            const closest = this.beamFrom.add(u.scale(tt));
            if (Vector3.Distance(closest, p.pos.add(new Vector3(0, 1, 0))) < 0.95)
              ctx.damagePlayer(rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, this.beamFrom, 'fireball', { source: this, unblockable: true });
            ctx.lights.addFx(to, new Color3(1, 0.3, 0.7), 4, 10, 0.3);
            ctx.particles.emit('sparks', to, new Vector3(0, 1, 0), 24, 1.5);
          }
          return true;
        }
        if (this.attackT > 0.28) this.beamFx = null;
        if (this.attackT > 0.6) {
          this.beamFx = null;
          this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
          return false;
        }
        return true;
      }
      case 'orbs': {
        face();
        if (this.attackPhase === 0 && this.attackT >= 0.6) {
          this.attackPhase = 1;
          this.attackT = 0;
          for (let i = -1; i <= 1; i++) {
            const a = this.yaw + i * 0.6;
            const from = new Vector3(this.pos.x, this.pos.y + 2.4, this.pos.z);
            ctx.projectiles.fireball(from, new Vector3(Math.sin(a), 0.25, Math.cos(a)), this, 18 * ctx.diff.enemyDamage, ctx, {
              speed: 7.5, sprite: 'orb', scale: 1.5, color: new Color3(1, 0.3, 0.8), homing: 1.5, life: 8,
            });
          }
        }
        if (this.attackPhase === 1 && this.attackT > 0.5) {
          this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
          return false;
        }
        return true;
      }
      case 'staff': {
        if (this.attackPhase === 0) {
          face();
          if (this.parriable) this.parryTell = 0.1;
          else this.dangerTell = 0.1;
          if (this.attackT >= this.def.meleeWindup) {
            this.attackPhase = 1;
            this.attackT = 0;
            ctx.sound('chainsword_hit', this.pos, { pitch: 0.75 });
            if (dist < this.def.meleeRange + p.radius + 0.4)
              ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee', { source: this, parriable: this.parriable });
          }
          return true;
        }
        if (this.attackT > 0.45) {
          this.attackCD = Math.min(this.attackCD, 0.5);
          return false;
        }
        return true;
      }
      case 'shield': {
        if (this.attackPhase === 0 && this.attackT >= 0.7) {
          this.attackPhase = 1;
          this.shieldHp = 320 * this.hpMul;
          ctx.particles.emit('teleport', this.eye, new Vector3(0, 1, 0), 30, 1.6);
        }
        return !(this.attackPhase === 1 && this.attackT > 1.0);
      }
      case 'summon': {
        if (this.attackPhase === 0 && this.attackT >= 0.9) {
          this.attackPhase = 1;
          for (let i = 0; i < 2; i++) {
            const kind = HOST[Math.floor(Math.random() * HOST.length)];
            const a = rand(0, Math.PI * 2);
            ctx.summon(kind, this.pos.x + Math.sin(a) * 7, this.pos.z + Math.cos(a) * 7, { hpMul: this.hpMul * 0.8 });
          }
        }
        return !(this.attackPhase === 1 && this.attackT > 1.3);
      }
      case 'raise': {
        face();
        if (this.attackPhase === 0 && this.attackT >= 1.4) {
          this.attackPhase = 1;
          // every fallen heretic rises again
          const dead = ctx.enemies.filter((e) => e.state === 'dead' && (e.kind === 'boltgunner' || e.kind === 'hellflamer' || e.kind === 'terminator')).slice(-6);
          for (const d of dead) {
            const r = ctx.summon(d.kind, d.pos.x, d.pos.z, { hpMul: this.hpMul * 0.8 });
            if (r) this.bound.push(r);
            d.deathT = 999; // leave the old corpse
          }
          if (this.bound.length === 0) {
            for (let i = 0; i < 3; i++) {
              const a = rand(0, Math.PI * 2);
              const r = ctx.summon(HOST[i], this.pos.x + Math.sin(a) * 6, this.pos.z + Math.cos(a) * 6, { hpMul: this.hpMul * 0.8 });
              if (r) this.bound.push(r);
            }
          }
          ctx.shake.add(0.8);
        }
        return !(this.attackPhase === 1 && this.attackT > 1.0);
      }
    }
    return false;
  }

  attackFrame(): string {
    if (this.move === 'staff') return this.attackPhase === 0 ? 'sorcerer_atk0' : 'sorcerer_atk1';
    return 'sorcerer_cast';
  }
}
