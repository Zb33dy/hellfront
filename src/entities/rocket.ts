import { Color3, Vector3 } from '@babylonjs/core';
import { ROCKET } from '../core/config';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';
import type { GameCtx } from '../scenes/context';

export interface RocketOpts {
  speed?: number;
  damage?: number;
  radius?: number;
  sprite?: string;
  tint?: [number, number, number];
  scale?: number;
  /** Follows the launcher's laser dot while it is on. */
  guided?: boolean;
  /** Green hell-fire burst instead of a rocket explosion. */
  flame?: boolean;
  /** Falls under gravity (cluster bomblets). */
  gravity?: boolean;
  /** Splits into bomblets on impact (launcher upgrade). */
  cluster?: boolean;
}

interface Live {
  pos: Vector3;
  dir: Vector3;
  t: number;
  alive: boolean;
  o: Required<RocketOpts>;
}

const DEFAULTS: Required<RocketOpts> = { speed: ROCKET.speed, damage: ROCKET.damage, radius: ROCKET.radius, sprite: 'rocket', tint: [1, 1, 1], scale: 1, guided: true, flame: false, gravity: false, cluster: false };

/** Player rockets: fast, straight, explode on the first thing they touch. */
export class Rockets {
  private list: Live[] = [];

  fire(ctx: GameCtx, opts: RocketOpts = {}): void {
    const o = { ...DEFAULTS, cluster: !opts.flame && ctx.hasMod('launcher'), ...opts };
    const p = ctx.player;
    const f = p.forward;
    const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const r: Live = { pos: p.eye.add(f.scale(0.7)).add(right.scale(0.18)).add(new Vector3(0, -0.12, 0)), dir: f.clone(), t: 0, alive: true, o };
    this.list.push(r);
    ctx.lights.addFx(r.pos, o.flame ? new Color3(0.3, 1, 0.5) : new Color3(1, 0.6, 0.25), 1.8, 7, undefined, () => (r.alive ? r.pos : null));
  }

  update(dt: number, ctx: GameCtx): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const r = this.list[i];
      r.t += dt;
      // laser guidance: turn toward the dot
      const target = r.o.guided ? ctx.laserPoint : null;
      if (target) {
        const want = target.subtract(r.pos);
        if (want.lengthSquared() > 0.25) {
          want.normalize();
          const k = Math.min(1, dt * 6);
          r.dir.set(r.dir.x + (want.x - r.dir.x) * k, r.dir.y + (want.y - r.dir.y) * k, r.dir.z + (want.z - r.dir.z) * k);
          if (r.dir.lengthSquared() < 1e-6) r.dir.copyFrom(want);
          r.dir.normalize();
        }
      }
      if (r.o.gravity) {
        r.dir.y -= dt * 4;
        r.dir.normalize();
      }
      const len = r.o.speed * dt;
      // enemies along the step
      let hit: Vector3 | null = null;
      for (const e of ctx.enemies) {
        if (!e.solid) continue;
        for (let k = 1; k <= 3 && !hit; k++) {
          const q = r.pos.add(r.dir.scale((len * k) / 3));
          const dx = q.x - e.pos.x, dz = q.z - e.pos.z;
          if (dx * dx + dz * dz < (e.radius + 0.25) ** 2 && q.y > e.pos.y && q.y < e.pos.y + e.height) hit = q;
        }
        if (hit) break;
      }
      if (!hit) {
        const h = ctx.world.raycast(r.pos, r.dir, len + 0.2);
        if (h.kind !== 'none' && h.kind !== 'entity') hit = h.point.subtract(r.dir.scale(0.3));
      }
      if (hit || r.t > (target ? 7 : 4)) {
        this.list.splice(i, 1);
        r.alive = false;
        this.explode(hit ?? r.pos, ctx, r.o);
        continue;
      }
      r.pos.addInPlace(r.dir.scale(len));
      if (r.o.flame) {
        if (Math.random() < 0.8) ctx.particles.emit('fire', r.pos, r.dir.scale(-1), 2, 0.3 * r.o.scale, 0.9);
        continue;
      }
      if (Math.random() < 0.9) ctx.particles.emit('smoke', r.pos.subtract(r.dir.scale(0.3)), r.dir.scale(-0.5), 1, 0.15, 0.7);
      if (Math.random() < 0.5) ctx.particles.emit('trail', r.pos, r.dir.scale(-0.2), 1, 0.2);
    }
  }

  private explode(pos: Vector3, ctx: GameCtx, o: Required<RocketOpts>): void {
    if (o.flame) {
      ctx.sound('barrel_explode', pos, { volume: 1.1, pitch: 1.25 });
      ctx.particles.emit('fire', pos, new Vector3(0, 1, 0), 30 + Math.floor(o.radius * 6), o.radius * 0.45, 1.3);
      ctx.lights.addFx(pos.add(new Vector3(0, 0.6, 0)), new Color3(0.3, 1, 0.5), 4, o.radius * 3, 0.4);
      ctx.radiusDamage(pos, o.radius, o.damage, this);
      ctx.noise(pos, 22);
      if (ctx.hasMod('flamer')) ctx.firePool(pos, o.radius * 0.8, 5);
      return;
    }
    ctx.sound('barrel_explode', pos, { volume: 1.3, pitch: 0.9 });
    ctx.particles.emit('fire', pos, new Vector3(0, 1, 0), 46, 2.4, 1.4);
    ctx.particles.emit('smoke', pos, new Vector3(0, 1, 0), 20, 1.8);
    ctx.particles.emit('sparks', pos, new Vector3(0, 1, 0), 24, 2);
    ctx.lights.addFx(pos.add(new Vector3(0, 0.6, 0)), new Color3(1, 0.6, 0.25), 5, 18, 0.45);
    const d = Vector3.Distance(pos, ctx.player.eye);
    ctx.shake.add(Math.max(0.15, 0.8 - d / 25));
    ctx.radiusDamage(pos, o.radius, o.damage, this);
    ctx.noise(pos, 32);
    if (o.cluster) {
      // cluster warheads: five bomblets scatter from the blast
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + Math.random();
        const b: Live = { pos: pos.add(new Vector3(0, 0.6, 0)), dir: new Vector3(Math.sin(a), 0.6, Math.cos(a)).normalize(), t: 0, alive: true, o: { ...DEFAULTS, speed: 9, damage: 55, radius: 2.8, scale: 0.55, guided: false, gravity: true, cluster: false } };
        this.list.push(b);
      }
    }
  }

  draw(batch: SpriteBatch): void {
    for (const r of this.list) batch.add(SPRITES[r.o.sprite + (Math.floor(r.t * 20) % 2)], r.pos.x, r.pos.y, r.pos.z, r.o.tint, { full: true, scale: r.o.scale, depthBias: 0 });
  }

  clear(): void {
    this.list.length = 0;
  }
}
