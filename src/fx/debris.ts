import { Vector3 } from '@babylonjs/core';
import { CELL } from '../core/config';
import type { World } from '../level/world';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';

interface Bit {
  pos: Vector3;
  vel: Vector3;
  sprite: string;
  life: number;
  scale: number;
  resting: boolean;
  bloody: boolean;
  bounces: number;
}

/** Physical bits: shell casings and gibs. They bounce, settle and (for gibs) leave blood. */
export class Debris {
  private bits: Bit[] = [];
  onLand: ((p: Vector3, bloody: boolean) => void) | null = null;
  onBounce: ((p: Vector3, metal: boolean) => void) | null = null;

  constructor(private world: World) {}

  spawn(sprite: string, pos: Vector3, vel: Vector3, life: number, scale = 1, bloody = false): void {
    if (this.bits.length > 180) this.bits.shift();
    this.bits.push({ pos: pos.clone(), vel: vel.clone(), sprite, life, scale, resting: false, bloody, bounces: 0 });
  }

  update(dt: number): void {
    const g = this.world.grid;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.bits.splice(i, 1);
        continue;
      }
      if (b.resting) continue;
      b.vel.y -= 16 * dt;
      const nx = b.pos.x + b.vel.x * dt, nz = b.pos.z + b.vel.z * dt;
      if (g.isSolid(g.cellAt(nx, b.pos.z))) b.vel.x *= -0.4;
      else b.pos.x = nx;
      if (g.isSolid(g.cellAt(b.pos.x, nz))) b.vel.z *= -0.4;
      else b.pos.z = nz;
      b.pos.y += b.vel.y * dt;
      const ground = this.world.groundAt(b.pos.x, b.pos.z, 0.05, b.pos.y + 0.3, 0.3);
      if (b.pos.y <= ground) {
        b.pos.y = ground;
        if (b.bounces === 0) this.onLand?.(b.pos, b.bloody);
        if (b.bounces < 3 && Math.abs(b.vel.y) > 1.2) this.onBounce?.(b.pos, !b.bloody);
        b.bounces++;
        b.vel.y = -b.vel.y * 0.35;
        b.vel.x *= 0.55;
        b.vel.z *= 0.55;
        if (Math.abs(b.vel.y) < 0.6) {
          b.resting = true;
          b.vel.setAll(0);
        }
      }
      void CELL;
    }
  }

  draw(batch: SpriteBatch, light: (x: number, z: number) => [number, number, number]): void {
    for (const b of this.bits) {
      const f = SPRITES[b.sprite];
      if (!f) continue;
      const fade = Math.min(1, b.life * 2);
      const l = light(b.pos.x, b.pos.z);
      batch.add(f, b.pos.x, b.pos.y + (f.h * b.scale) / 2, b.pos.z, [l[0] * fade, l[1] * fade, l[2] * fade], { full: true, scale: b.scale * fade, depthBias: 0.02 });
    }
  }

  clear(): void {
    this.bits.length = 0;
  }
}
