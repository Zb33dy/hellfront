import { Color3, Vector3 } from '@babylonjs/core';
import { FIREBALL } from '../core/config';
import type { SoundHandle } from '../audio/audioManager';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';
import type { GameCtx } from '../scenes/context';
import type { Enemy } from './enemy';

interface Fireball {
  pos: Vector3;
  vel: Vector3;
  owner: Enemy | null;
  damage: number;
  life: number;
  loop: SoundHandle;
  alive: boolean;
  t: number;
  bolt: boolean;
}

interface Impact {
  pos: Vector3;
  t: number;
}

/** Imp fireballs: slow enough to strafe, lit, with trail particles and a looping crackle. */
export class Projectiles {
  private balls: Fireball[] = [];
  private impacts: Impact[] = [];

  fireball(from: Vector3, dir: Vector3, owner: Enemy | null, damage: number, ctx: GameCtx, opts: { speed?: number; bolt?: boolean } = {}): void {
    const b: Fireball = {
      pos: from.clone(),
      vel: dir.normalizeToNew().scale(opts.speed ?? FIREBALL.speed),
      owner,
      damage,
      life: FIREBALL.life,
      loop: ctx.sound('fireball_fly', from, { loop: true }),
      alive: true,
      t: 0,
      bolt: !!opts.bolt,
    };
    this.balls.push(b);
    ctx.lights.addFx(b.pos, b.bolt ? new Color3(0.7, 0.3, 1) : new Color3(1, 0.5, 0.15), 1.8, 7, undefined, () => (b.alive ? b.pos : null));
  }

  update(dt: number, ctx: GameCtx): void {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.life -= dt;
      b.t += dt;
      const step = b.vel.scale(dt);
      const len = step.length();
      const dir = step.scale(1 / Math.max(len, 1e-6));
      const p = ctx.player;
      // player hit (swept sphere vs cylinder, sampled)
      let hitPlayer = false;
      for (let k = 1; k <= 3 && !hitPlayer; k++) {
        const q = b.pos.add(step.scale(k / 3));
        const dx = q.x - p.pos.x, dz = q.z - p.pos.z;
        if (!p.dead && dx * dx + dz * dz < (p.radius + FIREBALL.radius) ** 2 && q.y > p.pos.y - 0.1 && q.y < p.pos.y + p.height + 0.1) hitPlayer = true;
      }
      if (hitPlayer) {
        ctx.damagePlayer(b.damage, b.pos.subtract(b.vel), 'fireball');
        this.explode(b, ctx);
        this.balls.splice(i, 1);
        continue;
      }
      // monsters
      let hitE: Enemy | null = null;
      for (const e of ctx.enemies) {
        if (!e.solid || e === b.owner) continue;
        const q = b.pos.add(step);
        const dx = q.x - e.pos.x, dz = q.z - e.pos.z;
        if (dx * dx + dz * dz < (e.radius + FIREBALL.radius) ** 2 && q.y > e.pos.y && q.y < e.pos.y + e.height) {
          hitE = e;
          break;
        }
      }
      if (hitE) {
        ctx.damageEnemy(hitE, b.damage, b.vel, 'fireball');
        this.explode(b, ctx);
        this.balls.splice(i, 1);
        continue;
      }
      const hit = ctx.world.raycast(b.pos, dir, len + FIREBALL.radius);
      if (hit.kind !== 'none' || b.life <= 0) {
        if (hit.kind !== 'none') b.pos.copyFrom(hit.point.subtract(dir.scale(0.15)));
        if (hit.kind !== 'none') ctx.decals.add('scorch', hit.point, hit.normal, 0.9, [0.6, 0.6, 0.6]);
        this.explode(b, ctx);
        this.balls.splice(i, 1);
        continue;
      }
      b.pos.addInPlace(step);
      b.loop.setPosition(b.pos);
      if (Math.random() < 0.7) ctx.particles.emit('trail', b.pos, b.vel.scale(-0.05), 2, 0.4);
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      this.impacts[i].t += dt;
      if (this.impacts[i].t > 0.3) this.impacts.splice(i, 1);
    }
  }

  private explode(b: Fireball, ctx: GameCtx): void {
    b.alive = false;
    b.loop.stop(0.05);
    ctx.sound('fireball_impact', b.pos);
    ctx.particles.emit('fire', b.pos, new Vector3(0, 1, 0), 14, 1, 0.5);
    ctx.particles.emit('sparks', b.pos, new Vector3(0, 1, 0), 10, 1);
    ctx.lights.addFx(b.pos, new Color3(1, 0.55, 0.2), 3, 8, 0.35);
    this.impacts.push({ pos: b.pos.clone(), t: 0 });
  }

  draw(batch: SpriteBatch): void {
    const bright: [number, number, number] = [1, 1, 1];
    for (const b of this.balls) batch.add(SPRITES[(b.bolt ? 'bolt' : 'fireball') + (Math.floor(b.t * 12) % 2)], b.pos.x, b.pos.y, b.pos.z, bright, { full: true, scale: b.bolt ? 1.4 : 1.2, depthBias: 0 });
    for (const im of this.impacts) {
      const f = Math.min(2, Math.floor(im.t / 0.1));
      batch.add(SPRITES[`fireImpact${f}`], im.pos.x, im.pos.y, im.pos.z, bright, { full: true, scale: 1.4, depthBias: 0.3 });
    }
  }

  clear(): void {
    this.balls.forEach((b) => b.loop.stop(0));
    this.balls.length = 0;
    this.impacts.length = 0;
  }

  get count(): number {
    return this.balls.length;
  }
}
