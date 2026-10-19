import { Color3, Vector3 } from '@babylonjs/core';
import { ROCKET } from '../core/config';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';
import type { GameCtx } from '../scenes/context';

interface Live {
  pos: Vector3;
  dir: Vector3;
  t: number;
  alive: boolean;
}

/** Player rockets: fast, straight, explode on the first thing they touch. */
export class Rockets {
  private list: Live[] = [];

  fire(ctx: GameCtx): void {
    const p = ctx.player;
    const f = p.forward;
    const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const r: Live = { pos: p.eye.add(f.scale(0.7)).add(right.scale(0.18)).add(new Vector3(0, -0.12, 0)), dir: f.clone(), t: 0, alive: true };
    this.list.push(r);
    ctx.lights.addFx(r.pos, new Color3(1, 0.6, 0.25), 1.8, 7, undefined, () => (r.alive ? r.pos : null));
  }

  update(dt: number, ctx: GameCtx): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const r = this.list[i];
      r.t += dt;
      const len = ROCKET.speed * dt;
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
      if (hit || r.t > 4) {
        this.list.splice(i, 1);
        r.alive = false;
        this.explode(hit ?? r.pos, ctx);
        continue;
      }
      r.pos.addInPlace(r.dir.scale(len));
      if (Math.random() < 0.9) ctx.particles.emit('smoke', r.pos.subtract(r.dir.scale(0.3)), r.dir.scale(-0.5), 1, 0.15, 0.7);
      if (Math.random() < 0.5) ctx.particles.emit('trail', r.pos, r.dir.scale(-0.2), 1, 0.2);
    }
  }

  private explode(pos: Vector3, ctx: GameCtx): void {
    ctx.sound('barrel_explode', pos, { volume: 1.3, pitch: 0.9 });
    ctx.particles.emit('fire', pos, new Vector3(0, 1, 0), 46, 2.4, 1.4);
    ctx.particles.emit('smoke', pos, new Vector3(0, 1, 0), 20, 1.8);
    ctx.particles.emit('sparks', pos, new Vector3(0, 1, 0), 24, 2);
    ctx.lights.addFx(pos.add(new Vector3(0, 0.6, 0)), new Color3(1, 0.6, 0.25), 5, 18, 0.45);
    const d = Vector3.Distance(pos, ctx.player.eye);
    ctx.shake.add(Math.max(0.15, 0.8 - d / 25));
    ctx.radiusDamage(pos, ROCKET.radius, ROCKET.damage, this);
    ctx.noise(pos, 32);
  }

  draw(batch: SpriteBatch): void {
    for (const r of this.list) batch.add(SPRITES['rocket' + (Math.floor(r.t * 20) % 2)], r.pos.x, r.pos.y, r.pos.z, [1, 1, 1], { full: true, scale: 1, depthBias: 0 });
  }

  clear(): void {
    this.list.length = 0;
  }
}
