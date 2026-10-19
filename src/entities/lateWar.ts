import { Color3, Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { DamageKind, GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/**
 * Harrier — a winged carrion flyer. It hovers out of reach (melee and the chainsword cannot touch
 * it up there), spits arcing acid, and every so often folds its wings and DIVES at you. The dive
 * glows BLUE while it winds up: parry it (F), dodge it, or shoot it out of the air.
 */
export class Harrier extends Enemy {
  readonly kind = 'harrier' as const;
  readonly sounds: EnemySounds = { alert: 'imp_alert', pain: 'imp_pain', death: 'imp_death', idle: 'imp_growl', pitch: 1.65 };
  private diving = false;
  private hit = false;
  private readonly diveDir = new Vector3();

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('harrier', x, z, angle, hpMul);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los || this.attackCD > 0) return false;
    if (dist < 10 && Math.random() < 0.65) {
      this.diving = true;
      this.hit = false;
      this.setState('attack');
      ctx.sound('imp_alert', this.pos, { pitch: 2, volume: 0.9 });
      return true;
    }
    if (dist > this.def.rangedRange) return false;
    this.diving = false;
    this.setState('attack');
    return true;
  }

  private face(ctx: GameCtx): void {
    const p = ctx.player.pos;
    this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
  }

  updateAttack(dt: number, ctx: GameCtx): boolean {
    this.attackT += dt;
    const p = ctx.player;
    if (!this.diving) {
      this.face(ctx);
      if (this.attackPhase === 0 && this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
        this.attackPhase = 1;
        this.attackT = 0;
        const from = new Vector3(this.pos.x, this.pos.y + 0.5, this.pos.z);
        const to = new Vector3(p.pos.x, p.pos.y + 0.9, p.pos.z);
        const d = to.subtract(from).normalize();
        ctx.projectiles.fireball(from, d, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, {
          speed: 15, sprite: 'acid', scale: 1.1, color: new Color3(0.6, 1, 0.25),
        });
        ctx.sound('fireball_cast', this.pos, { pitch: 1.9, volume: 0.6 });
      }
      if (this.attackPhase === 1 && this.attackT > 0.35) {
        this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
        return false;
      }
      return true;
    }
    // dive: wind up (blue), swoop, climb back
    if (this.attackPhase === 0) {
      this.face(ctx);
      this.parryTell = 0.1;
      this.hover = (this.def.fly ?? 3) + 0.8;
      if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
        this.attackPhase = 1;
        this.attackT = 0;
        this.diveDir.set(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize();
        ctx.sound('pinky_charge', this.pos, { pitch: 1.8, volume: 0.8 });
      }
      return true;
    }
    if (this.attackPhase === 1) {
      this.hover = 0.5;
      // steer a little toward the target while swooping
      const want = new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize();
      this.diveDir.addInPlace(want.scale(dt * 2)).normalize();
      ctx.world.move(this, this.diveDir.x * 13 * dt, this.diveDir.z * 13 * dt, 0.6);
      this.yaw = Math.atan2(this.diveDir.x, this.diveDir.z);
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
      if (!this.hit && Math.hypot(dx, dz) < this.def.meleeRange + p.radius && Math.abs(this.pos.y - p.pos.y) < 2.2) {
        this.hit = true;
        ctx.sound('imp_claw', this.pos, { pitch: 1.3 });
        ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee', { source: this, parriable: true });
      }
      if (this.attackT > 0.8 || this.hit) {
        this.attackPhase = 2;
        this.attackT = 0;
      }
      return true;
    }
    this.hover = this.def.fly ?? 3;
    if (this.attackT > 0.6) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  setState(s: Enemy['state']): void {
    super.setState(s);
    if (s !== 'attack') this.hover = this.def.fly ?? 3;
  }

  frame(): string {
    if (this.state === 'dying' || this.state === 'dead' || this.state === 'pain' || this.state === 'attack') return super.frame();
    return `harrier_walk${Math.floor(this.animT * 11) % 4}`;
  }

  attackFrame(): string {
    if (!this.diving) return this.attackPhase === 0 ? 'harrier_cast' : 'harrier_walk1';
    return this.attackPhase === 0 ? 'harrier_atk0' : this.attackPhase === 1 ? 'harrier_atk1' : `harrier_walk${Math.floor(this.animT * 14) % 4}`;
  }
}

/**
 * Bulwark — a brute behind a riveted tower shield. Shots, flame and fire that hit the shield
 * barely scratch it; explosions only half-work. Get around it, hit it from above, or parry its
 * BLUE shield bash (F): a parried Bulwark drops its guard and takes full damage while staggered.
 * At range it hurls a spiked javelin over the shield.
 */
export class Bulwark extends Enemy {
  readonly kind = 'bulwark' as const;
  readonly sounds: EnemySounds = { alert: 'pinky_snarl', pain: 'pinky_pain', death: 'pinky_death', idle: 'pinky_snarl', pitch: 0.6 };
  private melee = false;
  private blockFx = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('bulwark', x, z, angle, hpMul);
  }

  /** True while the shield is up and facing `from`. */
  private blocks(dir: Vector3, ctx: GameCtx): boolean {
    if (this.staggerT > 0 || this.state === 'pain' || this.state === 'dying') return false;
    if (ctx.piercingShot) return false;
    // dir points from the attacker to us; the shield faces along our yaw
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const l = Math.hypot(dir.x, dir.z) || 1;
    return (-dir.x / l) * fx + (-dir.z / l) * fz > Math.cos(1.15);
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    if (!this.alive) return;
    if (this.blocks(dir, ctx)) {
      const mul = kind === 'blast' ? 0.5 : kind === 'saw' ? 0.35 : 0.06;
      if (this.blockFx <= 0) {
        this.blockFx = 0.08;
        ctx.sound('impact_metal', this.pos, { pitch: 0.6 + Math.random() * 0.2, volume: 0.8 });
        ctx.particles.emit('sparks', this.eye.add(new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).scale(this.radius)), new Vector3(-dir.x, 0.4, -dir.z), 6, 0.6);
      }
      amount *= mul;
      if (kind !== 'blast') {
        // the shield takes the knock, not the brute
        this.hp -= amount;
        if (this.hp <= 0) super.damage(1, dir, kind, ctx);
        else if (this.state === 'idle' || this.state === 'alert') this.alertNow(ctx);
        return;
      }
    }
    super.damage(amount, dir, kind, ctx);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    this.blockFx -= 1 / 60;
    if (dist < this.def.meleeRange + ctx.player.radius && this.attackCD <= 0.5) {
      this.melee = true;
      this.setState('attack');
      return true;
    }
    if (!los || this.attackCD > 0 || dist > this.def.rangedRange || dist < 6) return false;
    this.melee = false;
    this.setState('attack');
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    const p = ctx.player;
    this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (this.melee) {
      if (this.attackPhase === 0) {
        this.parryTell = 0.1;
        if (this.attackT >= this.def.meleeWindup / Math.sqrt(ctx.diff.aggression)) {
          this.attackPhase = 1;
          this.attackT = 0;
          ctx.sound('impact_metal', this.pos, { pitch: 0.4, volume: 1.3 });
          ctx.shake.add(0.3);
          if (dist < this.def.meleeRange + p.radius + 0.5) {
            ctx.damagePlayer(rand(...this.def.meleeDamage) * ctx.diff.enemyDamage, this.pos, 'melee', { source: this, parriable: true });
            const f = new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z).normalize();
            ctx.pushPlayer(f.scale(9));
          }
        }
        return true;
      }
      if (this.attackT > 0.55) {
        this.attackCD = 1.2;
        return false;
      }
      return true;
    }
    if (this.attackPhase === 0 && this.attackT >= this.def.rangedWindup) {
      this.attackPhase = 1;
      this.attackT = 0;
      const from = new Vector3(this.pos.x, this.pos.y + 2.6, this.pos.z);
      const d = new Vector3(p.pos.x, p.pos.y + 1.2, p.pos.z).subtract(from).normalize();
      ctx.projectiles.fireball(from, d, this, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, ctx, {
        speed: 24, sprite: 'shard', scale: 1.3, color: new Color3(1, 0.85, 0.6), quiet: true,
      });
      ctx.sound('chainsword_swing', this.pos, { pitch: 0.55 });
    }
    if (this.attackPhase === 1 && this.attackT > 0.4) {
      this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
      return false;
    }
    return true;
  }

  attackFrame(): string {
    if (this.melee) return this.attackPhase === 0 ? 'bulwark_atk0' : 'bulwark_atk1';
    return this.attackPhase === 0 ? 'bulwark_cast' : 'bulwark_idle';
  }
}
