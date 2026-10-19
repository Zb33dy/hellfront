import { Color3, Vector3 } from '@babylonjs/core';
import { GRENADE } from '../core/config';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';
import type { GameCtx } from '../scenes/context';

interface Live {
  pos: Vector3;
  vel: Vector3;
  t: number;
  spin: number;
}

/** Thrown frag grenades: arc under gravity, bounce off walls and floors, explode on a fuse. */
export class Grenades {
  private list: Live[] = [];

  throw(ctx: GameCtx): void {
    const p = ctx.player;
    const f = p.forward;
    const from = p.eye.add(f.scale(0.6)).add(new Vector3(0, -0.15, 0));
    const vel = f.scale(GRENADE.speed).add(new Vector3(0, 3.6, 0)).add(new Vector3(p.vel.x, 0, p.vel.z).scale(0.5));
    this.list.push({ pos: from, vel, t: 0, spin: Math.random() * 4 });
    ctx.sound('shotgun_pump', null, { pitch: 1.7, volume: 0.6 });
  }

  update(dt: number, ctx: GameCtx): void {
    const w = ctx.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i];
      g.t += dt;
      g.vel.y -= 20 * dt;
      // direct hit on a monster detonates early (feels responsive in bullet time)
      let hitMonster = false;
      for (const e of ctx.enemies) {
        if (!e.solid) continue;
        const dx = g.pos.x - e.pos.x, dz = g.pos.z - e.pos.z;
        if (dx * dx + dz * dz < (e.radius + 0.2) ** 2 && g.pos.y > e.pos.y && g.pos.y < e.pos.y + e.height && g.t > 0.08) hitMonster = true;
      }
      const step = g.vel.scale(dt);
      const len = step.length();
      if (len > 1e-5) {
        const dir = step.scale(1 / len);
        const hit = w.raycast(g.pos, dir, len + 0.12);
        if (hit.kind !== 'none' && hit.kind !== 'entity') {
          // reflect and damp
          const n = hit.normal;
          const vn = Vector3.Dot(g.vel, n);
          g.vel.subtractInPlace(n.scale(1.6 * vn)).scaleInPlace(0.55);
          g.pos.copyFrom(hit.point.add(n.scale(0.12)));
          if (Math.abs(vn) > 3) ctx.sound('impact_metal', g.pos, { volume: 0.4, pitch: 1.5 });
        } else g.pos.addInPlace(step);
      }
      const ground = w.groundAt(g.pos.x, g.pos.z, 0.1, g.pos.y, 0.3);
      if (g.pos.y < ground + 0.1) {
        g.pos.y = ground + 0.1;
        if (g.vel.y < 0) {
          if (g.vel.y < -3) ctx.sound('impact_metal', g.pos, { volume: 0.35, pitch: 1.7 });
          g.vel.y = -g.vel.y * 0.35;
          g.vel.x *= 0.7;
          g.vel.z *= 0.7;
        }
      }
      g.spin += dt * 12;
      if (g.t >= GRENADE.fuse || hitMonster) {
        this.list.splice(i, 1);
        this.explode(g.pos, ctx);
      }
    }
  }

  private explode(pos: Vector3, ctx: GameCtx): void {
    const c = pos.add(new Vector3(0, 0.3, 0));
    ctx.sound('barrel_explode', c, { volume: 1.2 });
    ctx.particles.emit('fire', c, new Vector3(0, 1, 0), 40, 2.2, 1.3);
    ctx.particles.emit('smoke', c, new Vector3(0, 1, 0), 18, 1.6);
    ctx.particles.emit('sparks', c, new Vector3(0, 1, 0), 26, 2);
    ctx.lights.addFx(c.add(new Vector3(0, 0.8, 0)), new Color3(1, 0.6, 0.25), 4.5, 16, 0.4);
    ctx.decals.add('scorch', new Vector3(pos.x, ctx.world.groundAt(pos.x, pos.z, 0.1, pos.y, 0.3) + 0.01, pos.z), new Vector3(0, 1, 0), 2.2, [0.6, 0.6, 0.6]);
    const d = Vector3.Distance(c, ctx.player.eye);
    ctx.shake.add(Math.max(0.15, 0.7 - d / 25));
    ctx.radiusDamage(c, GRENADE.radius, GRENADE.damage, this);
    ctx.noise(pos, 30);
  }

  draw(batch: SpriteBatch, ctx: GameCtx): void {
    for (const g of this.list) {
      const l = ctx.lightAt(g.pos.x, g.pos.z);
      const blink = g.t > GRENADE.fuse - 0.5 && Math.floor(g.t * 14) % 2 === 0;
      batch.add(SPRITES[blink ? 'grenade1' : 'grenade0'], g.pos.x, g.pos.y - 0.1, g.pos.z, [l[0] + 0.3, l[1] + 0.3, l[2] + 0.3], { full: blink, depthBias: 0.05 });
    }
  }

  clear(): void {
    this.list.length = 0;
  }
}
