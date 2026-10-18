import { Color3, Vector3 } from '@babylonjs/core';
import { rand } from '../core/util';
import type { GameCtx } from '../scenes/context';
import { Enemy, type EnemySounds } from './enemy';

/** Possessed trooper: raises the rifle (telegraph), then fires a hitscan shot. Drops a clip. */
export class Zombieman extends Enemy {
  readonly kind = 'zombieman' as const;
  readonly sounds: EnemySounds = { alert: 'zombie_alert', pain: 'zombie_pain', death: 'zombie_death' };
  private shots = 0;
  private flashT = 0;

  constructor(x: number, z: number, angle: number, hpMul: number) {
    super('zombieman', x, z, angle, hpMul);
  }

  tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean {
    if (!los || this.attackCD > 0 || dist > this.def.rangedRange) return false;
    if (Math.random() > 0.55 + 0.2 * ctx.diff.aggression) {
      this.attackCD = 0.4;
      return false;
    }
    this.setState('attack');
    this.shots = ctx.diff.aggression > 1.2 && Math.random() < 0.5 ? 2 : 1;
    return true;
  }

  updateAttack(dt: number, ctx: GameCtx, dist: number): boolean {
    this.attackT += dt;
    this.flashT -= dt;
    const p = ctx.player;
    const to = new Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
    this.yaw = Math.atan2(to.x, to.z);
    if (this.attackPhase === 0 && this.attackT >= this.def.rangedWindup / Math.sqrt(ctx.diff.aggression)) {
      this.attackPhase = 1;
      this.attackT = 0;
      this.fire(ctx, dist);
    } else if (this.attackPhase === 1 && this.attackT > 0.28) {
      this.shots--;
      if (this.shots > 0) {
        this.attackPhase = 0;
        this.attackT = this.def.rangedWindup * 0.6;
      } else {
        this.attackCD = rand(...this.def.rangedCooldown) / ctx.diff.aggression;
        return false;
      }
    }
    return true;
  }

  private fire(ctx: GameCtx, dist: number): void {
    const p = ctx.player;
    const origin = this.eye;
    const target = new Vector3(p.pos.x, p.pos.y + 1.1, p.pos.z);
    const dir = target.subtract(origin).normalize();
    // inaccuracy grows with distance and with how fast the player is moving
    const spread = 0.055 + dist * 0.0018 + p.speed * 0.009;
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();
    ctx.sound('zombie_fire', this.pos);
    ctx.lights.addFx(origin.add(dir.scale(0.6)), new Color3(1, 0.75, 0.35), 2.2, 7, 0.08);
    ctx.hitscan(origin, dir, this.def.rangedRange + 6, rand(...this.def.rangedDamage) * ctx.diff.enemyDamage, this, 'bullet');
    this.flashT = 0.1;
    ctx.noise(this.pos, 8);
  }

  attackFrame(): string {
    return this.attackPhase === 1 && this.attackT < 0.12 ? 'zombieman_atk1' : 'zombieman_atk0';
  }
}
