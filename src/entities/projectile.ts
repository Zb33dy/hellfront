import { Color3, Vector3 } from '@babylonjs/core';
import { FIREBALL } from '../core/config';
import type { SoundHandle } from '../audio/audioManager';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';
import type { GameCtx, HitOpts } from '../scenes/context';
import type { Enemy } from './enemy';

export interface ShotOpts {
  speed?: number;
  /** Legacy presets. */
  bolt?: boolean;
  shard?: boolean;
  /** Sprite base name (frames <name>0 / <name>1). */
  sprite?: string;
  scale?: number;
  color?: Color3;
  /** Homing: turn rate (rad/s) toward the player. */
  homing?: number;
  life?: number;
  hit?: HitOpts;
  /** Silent (rapid-fire bolts would otherwise stack loops). */
  quiet?: boolean;
}

interface Ball {
  pos: Vector3;
  vel: Vector3;
  owner: Enemy | null;
  damage: number;
  life: number;
  loop: SoundHandle | null;
  alive: boolean;
  t: number;
  sprite: string;
  scale: number;
  color: Color3;
  homing: number;
  speed: number;
  hit: HitOpts;
}

interface Impact {
  pos: Vector3;
  t: number;
}

/** Monster projectiles: fireballs, hellbolts, bone shards, heretic bolts and homing orbs. */
export class Projectiles {
  private balls: Ball[] = [];
  private impacts: Impact[] = [];

  fireball(from: Vector3, dir: Vector3, owner: Enemy | null, damage: number, ctx: GameCtx, opts: ShotOpts = {}): void {
    const sprite = opts.sprite ?? (opts.bolt ? 'bolt' : opts.shard ? 'shard' : 'fireball');
    const color = opts.color ?? (opts.bolt ? new Color3(0.7, 0.3, 1) : opts.shard ? new Color3(0.5, 1, 0.8) : new Color3(1, 0.5, 0.15));
    const speed = opts.speed ?? FIREBALL.speed;
    const b: Ball = {
      pos: from.clone(),
      vel: dir.normalizeToNew().scale(speed),
      owner,
      damage,
      life: opts.life ?? FIREBALL.life,
      loop: opts.quiet ? null : ctx.sound('fireball_fly', from, { loop: true, pitch: opts.shard ? 1.8 : opts.bolt ? 0.7 : opts.homing ? 0.5 : 1, volume: opts.shard ? 0.5 : 1 }),
      alive: true,
      t: 0,
      sprite,
      scale: opts.scale ?? (opts.bolt ? 1.4 : opts.shard ? 1.1 : 1.2),
      color,
      homing: opts.homing ?? 0,
      speed,
      hit: opts.hit ?? { source: owner ?? undefined },
    };
    this.balls.push(b);
    ctx.lights.addFx(b.pos, color, opts.shard || opts.quiet ? 0.9 : 1.8, opts.shard || opts.quiet ? 4 : 7, undefined, () => (b.alive ? b.pos : null));
  }

  update(dt: number, ctx: GameCtx): void {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.life -= dt;
      b.t += dt;
      if (b.homing > 0 && !ctx.player.dead && !ctx.playerHidden) {
        // steer toward where the player is now (slow orbs: dodge with cover or a timed jump)
        const to = ctx.player.pos.add(new Vector3(0, 1, 0)).subtract(b.pos).normalize();
        const cur = b.vel.normalizeToNew();
        const ang = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(cur, to))));
        const k = ang > 1e-4 ? Math.min(1, (b.homing * dt) / ang) : 0;
        const nd = cur.scale(1 - k).add(to.scale(k)).normalize();
        b.vel.copyFrom(nd.scale(b.speed));
      }
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
        ctx.damagePlayer(b.damage, b.pos.subtract(b.vel), 'fireball', b.hit);
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
      b.loop?.setPosition(b.pos);
      if (Math.random() < 0.7) ctx.particles.emit('trail', b.pos, b.vel.scale(-0.05), 2, 0.4);
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      this.impacts[i].t += dt;
      if (this.impacts[i].t > 0.3) this.impacts.splice(i, 1);
    }
  }

  private explode(b: Ball, ctx: GameCtx): void {
    b.alive = false;
    b.loop?.stop(0.05);
    if (!b.loop) {
      // rapid-fire bolts / flame puffs: a small, silent pop
      ctx.particles.emit(b.sprite === 'flame' ? 'fire' : 'sparks', b.pos, new Vector3(0, 1, 0), 3, 0.4, 0.6);
      return;
    }
    ctx.sound('fireball_impact', b.pos, { volume: b.loop ? 1 : 0.5 });
    ctx.particles.emit('fire', b.pos, new Vector3(0, 1, 0), 14, 1, 0.5);
    ctx.particles.emit('sparks', b.pos, new Vector3(0, 1, 0), 10, 1);
    ctx.lights.addFx(b.pos, b.color, 3, 8, 0.35);
    this.impacts.push({ pos: b.pos.clone(), t: 0 });
  }

  draw(batch: SpriteBatch): void {
    const bright: [number, number, number] = [1, 1, 1];
    for (const b of this.balls) batch.add(SPRITES[b.sprite + (Math.floor(b.t * 12) % 2)], b.pos.x, b.pos.y, b.pos.z, bright, { full: true, scale: b.scale, depthBias: 0 });
    for (const im of this.impacts) {
      const f = Math.min(2, Math.floor(im.t / 0.1));
      batch.add(SPRITES[`fireImpact${f}`], im.pos.x, im.pos.y, im.pos.z, bright, { full: true, scale: 1.4, depthBias: 0.3 });
    }
  }

  clear(): void {
    this.balls.forEach((b) => b.loop?.stop(0));
    this.balls.length = 0;
    this.impacts.length = 0;
  }

  get count(): number {
    return this.balls.length;
  }
}
