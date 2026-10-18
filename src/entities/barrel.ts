import { Color3, Vector3 } from '@babylonjs/core';
import { BARREL } from '../core/config';
import type { Collider } from '../level/world';
import type { GameCtx } from '../scenes/context';

/** Explosive toxic barrel. Damage → short fuse → blast (chains into nearby barrels). */
export class Barrel {
  hp = BARREL.hp;
  fuse = -1;
  exploded = false;
  readonly collider: Collider;

  constructor(readonly pos: Vector3, readonly index: number) {
    const r = BARREL.radius;
    this.collider = { minX: pos.x - r, maxX: pos.x + r, minZ: pos.z - r, maxZ: pos.z + r, minY: pos.y, maxY: pos.y + BARREL.height, owner: this, solidForShots: true };
  }

  damage(amount: number, chained: boolean): void {
    if (this.exploded || this.fuse >= 0) return;
    this.hp -= amount;
    if (this.hp <= 0) this.fuse = chained ? BARREL.chainDelay + Math.random() * 0.08 : 0.04;
  }

  update(dt: number, ctx: GameCtx): void {
    if (this.exploded || this.fuse < 0) return;
    this.fuse -= dt;
    if (this.fuse <= 0) this.explode(ctx);
  }

  private explode(ctx: GameCtx): void {
    this.exploded = true;
    ctx.world.removeCollider(this.collider);
    const c = new Vector3(this.pos.x, this.pos.y + 0.6, this.pos.z);
    ctx.sound('barrel_explode', c);
    ctx.particles.emit('fire', c, new Vector3(0, 1, 0), 40, 1, 1.4);
    ctx.particles.emit('smoke', c.add(new Vector3(0, 0.6, 0)), new Vector3(0, 1, 0), 18, 0.7);
    ctx.particles.emit('sparks', c, new Vector3(0, 1, 0), 30, 1);
    ctx.particles.emit('splash', c, new Vector3(0, 1, 0), 20, 1);
    ctx.lights.addFx(c, new Color3(1, 0.6, 0.25), 5, 13, 0.55);
    ctx.decals.add('scorch', new Vector3(this.pos.x, this.pos.y + 0.01, this.pos.z), new Vector3(0, 1, 0), 3.2, [0.7, 0.7, 0.7]);
    for (let k = 0; k < 5; k++) {
      ctx.debris.spawn('casing', c, new Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 4, (Math.random() - 0.5) * 8), 4, 2.2);
    }
    const d = Vector3.Distance(c, ctx.player.eye);
    ctx.shake.add(Math.max(0, 0.9 - d / 18));
    ctx.radiusDamage(c, BARREL.blastRadius, BARREL.blastDamage, this);
    ctx.noise(c, 20);
  }
}

/** Decorative solid prop (lamps, tech columns). */
export interface Prop {
  kind: 'lamp' | 'techColumn' | 'corpse';
  pos: Vector3;
  collider: Collider | null;
}
