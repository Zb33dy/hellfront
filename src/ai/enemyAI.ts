import { Vector3 } from '@babylonjs/core';
import { CELL } from '../core/config';
import { angleDiff, rand } from '../core/util';
import type { Enemy } from '../entities/enemy';
import { CellKind } from '../level/grid';
import type { GameCtx } from '../scenes/context';

const STEP = 0.62;

/**
 * Monster brain: idle → alert → chase ⇄ attack, with pain interrupts and death.
 * Sight uses real line-of-sight rays; hearing uses path distance on the flow field.
 */
export function updateEnemy(e: Enemy, dt: number, ctx: GameCtx): void {
  e.stateT += dt;
  e.animT += dt;
  e.painFlash -= dt;
  if (e.state === 'dormant') return;
  if (e.staggerT > 0 && e.alive) {
    e.staggerT -= dt;
    e.moving = false;
    applyPhysics(e, dt, ctx, 0, 0);
    if (e.staggerT <= 0) e.setState('chase');
    return;
  }
  if (e.state === 'dying' || e.state === 'dead') {
    e.deathT += dt;
    if (e.state === 'dying' && e.deathT > 0.7) e.setState('dead');
    applyPhysics(e, dt, ctx, 0, 0);
    return;
  }

  const p = ctx.player;
  const toP = new Vector3(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z);
  const dist = toP.length();

  // sight check (throttled)
  e.seeCheckT -= dt;
  if (e.seeCheckT <= 0) {
    e.seeCheckT = 0.2 + Math.random() * 0.1;
    e.seesPlayer = !p.dead && dist < e.def.sightRange && ctx.canSeePlayer(e.eye);
    if (e.seesPlayer) e.lastSeen = p.pos.clone();
  }

  let mx = 0, mz = 0;
  switch (e.state) {
    case 'idle': {
      e.moving = false;
      if (e.seesPlayer) {
        const facing = angleDiff(e.yaw, Math.atan2(toP.x, toP.z));
        const cone = e.ambush ? 1.1 : Math.PI * 0.55;
        if (Math.abs(facing) < cone || dist < 4) e.alertNow(ctx);
      }
      e.idleSoundT -= dt;
      if (e.idleSoundT <= 0 && e.sounds.idle && dist < 25) {
        e.idleSoundT = rand(5, 12);
        ctx.sound(e.sounds.idle, e.pos, { volume: 0.7 });
      }
      break;
    }
    case 'alert': {
      e.moving = false;
      faceToward(e, toP, dt, 10);
      if (e.stateT > e.def.reaction / ctx.diff.aggression) e.setState('chase');
      break;
    }
    case 'pain': {
      e.moving = false;
      if (e.stateT > e.def.painTime) e.setState('chase');
      break;
    }
    case 'attack': {
      e.moving = false;
      if (!e.updateAttack(dt, ctx, dist)) e.setState('chase');
      break;
    }
    case 'chase': {
      if (p.dead) {
        e.moving = false;
        break;
      }
      e.attackCD -= dt;
      if (e.tryAttack(ctx, dist, e.seesPlayer)) break;
      if (e.chaseSpeed() <= 0) {
        e.moving = false;
        break;
      }
      // pick movement goal
      let gx: number, gz: number;
      const direct = e.seesPlayer && dist < 16;
      if (direct) {
        gx = p.pos.x;
        gz = p.pos.z;
      } else {
        const n = ctx.nav.next(e.pos.x, e.pos.z);
        if (n) {
          [gx, gz] = n;
        } else if (e.lastSeen) {
          gx = e.lastSeen.x;
          gz = e.lastSeen.z;
        } else {
          e.moving = false;
          break;
        }
      }
      const dx = gx - e.pos.x, dz = gz - e.pos.z;
      const dl = Math.hypot(dx, dz);
      const minDist = e.radius + p.radius + 0.25;
      if (direct && dist < minDist) {
        e.moving = false;
        faceToward(e, toP, dt, 8);
        break;
      }
      if (dl > 0.05) {
        let ux = dx / dl, uz = dz / dl;
        // ranged monsters weave sideways when they have a clear view
        e.strafeT -= dt;
        if (e.strafeT <= 0) {
          e.strafeT = rand(0.6, 1.6);
          e.strafe = e.kind === 'pinky' ? 0 : Math.random() < 0.5 ? rand(-0.8, 0.8) : 0;
        }
        e.nudgeT -= dt;
        if ((direct && e.strafe !== 0 && dist > 4) || e.nudgeT > 0) {
          const sx = -uz * e.strafe, sz = ux * e.strafe;
          ux += sx;
          uz += sz;
          const l = Math.hypot(ux, uz);
          ux /= l;
          uz /= l;
        }
        const sp = e.chaseSpeed() * e.speedMul * (0.9 + 0.1 * ctx.diff.aggression);
        mx = ux * sp;
        mz = uz * sp;
        e.moving = true;
        faceToward(e, new Vector3(ux, 0, uz), dt, 8);
        openDoorAhead(e, ux, uz, ctx);
      }
      break;
    }
  }
  applyPhysics(e, dt, ctx, mx, mz);
}

function faceToward(e: Enemy, d: Vector3, dt: number, rate: number): void {
  const target = Math.atan2(d.x, d.z);
  e.yaw += angleDiff(e.yaw, target) * Math.min(1, rate * dt);
}

function openDoorAhead(e: Enemy, ux: number, uz: number, ctx: GameCtx): void {
  const i = ctx.world.grid.cellAt(e.pos.x + ux * (e.radius + 0.6), e.pos.z + uz * (e.radius + 0.6));
  if (i < 0 || ctx.world.grid.kind[i] !== CellKind.Door) return;
  const d = ctx.world.doorAt(i);
  if (d && d.def.type === 'normal' && (d.state === 'closed' || d.state === 'closing')) d.use(new Set(), false);
}

function applyPhysics(e: Enemy, dt: number, ctx: GameCtx, mx: number, mz: number): void {
  const w = ctx.world;
  const kx = e.knock.x, kz = e.knock.z;
  e.knock.scaleInPlace(Math.exp(-7 * dt));
  const before = e.pos.clone();
  if (e.solid) {
    w.move(e, (mx + kx) * dt, (mz + kz) * dt, STEP);
    // avoid walking into nukage unless chasing through it is the only path (flow field handles cost)
  } else {
    e.pos.x += kx * dt * 0.5;
    e.pos.z += kz * dt * 0.5;
    w.resolve(e, STEP);
  }
  const ground = w.groundAt(e.pos.x, e.pos.z, e.radius, e.pos.y, STEP);
  if (e.pos.y > ground + 0.02) {
    e.vy -= 18 * dt;
    e.pos.y = Math.max(ground, e.pos.y + e.vy * dt);
    if (e.pos.y <= ground) e.vy = 0;
  } else {
    e.pos.y = ground;
    e.vy = 0;
  }
  // stuck detection: nudge sideways
  if (e.moving) {
    const moved = Math.hypot(e.pos.x - before.x, e.pos.z - before.z);
    if (moved < e.chaseSpeed() * dt * 0.2) {
      e.stuckT += dt;
      if (e.stuckT > 0.5) {
        e.stuckT = 0;
        e.strafe = Math.random() < 0.5 ? -1.2 : 1.2;
        e.nudgeT = 0.5;
      }
    } else e.stuckT = 0;
  }
  void CELL;
}
