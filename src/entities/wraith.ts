import { Color3, Vector3 } from '@babylonjs/core';
import { SHARD } from '../core/config';
import { rand } from '../core/util';
import { CellKind } from '../level/grid';
import type { DamageKind, GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/**
 * Chapter 4 skirmisher. Fast and fragile; when it is in your sights (or gets hit) it blinks
 * a few metres sideways. Throws a fan of three bone shards, claws up close.
 */
export class Wraith extends Enemy {
  readonly kind = 'wraith' as const;
  readonly sounds: EnemySounds = { alert: 'imp_alert', pain: 'imp_pain', death: 'imp_death', idle: 'imp_growl', pitch: 1.45 };
  private melee = false;
  /** Game time after which the next blink is allowed. */
  private blinkAt = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('wraith', x, z, angle, hpMul);
  }

  /** Teleports perpendicular to the player's line of fire. */
  private blink(ctx: GameCtx): boolean {
    if (ctx.time < this.blinkAt || !this.alive) return false;
    const p = ctx.player;
    const to = new Vector3(this.pos.x - p.pos.x, 0, this.pos.z - p.pos.z).normalize();
    const side = new Vector3(-to.z, 0, to.x);
    const g = ctx.world.grid;
    for (let tries = 0; tries < 6; tries++) {
      const dir = (tries % 2 === 0 ? 1 : -1) * (Math.random() < 0.5 ? 1 : -1);
      const d = rand(3.5, 6.5);
      const nx = this.pos.x + side.x * d * dir + to.x * rand(-1, 1.5);
      const nz = this.pos.z + side.z * d * dir + to.z * rand(-1, 1.5);
      const ci = g.cellAt(nx, nz);
      if (ci < 0 || g.isSolid(ci) || g.kind[ci] === CellKind.Nukage || g.kind[ci] === CellKind.Door) continue;
      const target = new Vector3(nx, this.pos.y + 1, nz);
      if (!ctx.world.los(this.pos.add(new Vector3(0, 1, 0)), target)) continue;
      ctx.particles.emit('teleport', this.pos.add(new Vector3(0, 1, 0)), new Vector3(0, 1, 0), 14, 0.6);
      ctx.lights.addFx(this.pos.add(new Vector3(0, 1.2, 0)), new Color3(0.4, 1, 0.8), 1.6, 5, 0.3);
      this.pos.x = nx;
      this.pos.z = nz;
      this.pos.y = ctx.world.groundAt(nx, nz, this.radius, 10, 20);
      ctx.particles.emit('teleport', this.pos.add(new Vector3(0, 1, 0)), new Vector3(0, 1, 0), 14, 0.6);
      ctx.sound('teleport', this.pos, { pitch: 1.7, volume: 0.6 });
      this.blinkAt = ctx.time + rand(2.2, 3.4) / ctx.diff.aggression;
      this.attackCD = Math.min(this.attackCD, 0.25);
      return true;
    }
    this.blinkAt = ctx.time + 0.5;
    return false;
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    super.damage(amount, dir, kind, ctx);
    if (this.alive && kind !== 'saw' && Math.random() < 0.55) {
      if (this.blink(ctx) && this.state === 'pain') this.setState('chase');
    }
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los) return false;
    // dodge when the player is looking straight at it
    const p = ctx.player;
    const f = p.forward;
    const to = new Vector3(this.pos.x - p.pos.x, 0, this.pos.z - p.pos.z);
    const len = to.length();
    if (len > 4 && (f.x * to.x + f.z * to.z) / Math.max(1e-3, len * Math.hypot(f.x, f.z)) > 0.985 && Math.random() < 0.04 * ctx.diff.aggression) {
      if (this.blink(ctx)) return false;
    }
    if (dist < this.def.meleeRange + p.radius) {
      this.melee = true;
      this.setState('attack');
      return true;
    }
    if (this.attackCD > 0 || dist > this.def.rangedRange) return false;
    this.melee = false;
    this.setState('attack');
    ctx.sound('fireball_cast', this.pos, { pitch: 1.6, volume: 0.7 });
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (this.melee) {
      if (this.attackPhase === 0 && this.attackT >= this.def.meleeWindup) {
        this.attackPhase = 1;
        this.attackT = 0;
        ctx.sound('imp_claw', this.pos, { pitch: 1.3 });
        if (dist < this.def.meleeRange + p.radius + 0.4) ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee');
      }
      if (this.attackPhase === 1 && this.attackT > 0.25) {
        this.attackCD = rand(0.4, 0.8);
        return false;
      }
      return true;
    }
    if (this.attackPhase === 0 && this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
      this.attackPhase = 1;
      this.attackT = 0;
      const from = new Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
      const base = new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z).subtract(from).normalize();
      const yaw = Math.atan2(base.x, base.z);
      const horiz = Math.hypot(base.x, base.z);
      for (let i = -1; i <= 1; i++) {
        const a = yaw + i * 0.13;
        const d = new Vector3(Math.sin(a) * horiz, base.y, Math.cos(a) * horiz);
        ctx.projectiles.fireball(from.add(d.scale(this.radius + 0.3)), d, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, { speed: SHARD.speed, shard: true });
      }
    }
    if (this.attackPhase === 1 && this.attackT > 0.3) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.melee) return this.attackPhase === 0 ? 'wraith_atk0' : 'wraith_atk1';
    return this.attackPhase === 0 ? 'wraith_cast' : 'wraith_atk1';
  }
}
