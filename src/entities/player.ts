import { Vector3 } from '@babylonjs/core';
import { AMMO_MAX, PICKUPS, PLAYER, type AmmoType, type KeyColor, type WeaponId } from '../core/config';
import { clamp, damp } from '../core/util';
import type { Input } from '../core/input';
import type { Settings } from '../core/settingsStore';
import { CellKind } from '../level/grid';
import type { World } from '../level/world';

export interface PlayerState {
  health: number;
  armor: number;
  ammo: Record<AmmoType, number>;
  weapons: WeaponId[];
  keys: KeyColor[];
}

export interface PlayerEvents {
  onStep(metal: boolean, nukage: boolean): void;
  onLand(speed: number): void;
  onNukage(): void;
  onJump(): void;
}

/** First-person body: Quake-style acceleration, circle collision with wall sliding, step smoothing. */
export class Player {
  readonly pos = new Vector3();
  readonly vel = new Vector3();
  yaw = 0;
  pitch = 0;
  radius = PLAYER.radius;
  height: number = PLAYER.height;
  health = 100;
  armor = 0;
  ammo: Record<AmmoType, number> = { bullets: PICKUPS.startBullets, shells: 0, rounds: 0, grenades: 0 };
  weapons = new Set<WeaponId>(['pistol']);
  keys = new Set<KeyColor>();
  onGround = true;
  dead = false;
  deathTime = 0;
  noclip = false;
  private eyeSmooth = 0;
  bobPhase = 0;
  bobAmount = 0;
  landDip = 0;
  private stepDist = 0;
  private nukageT = 0;
  roll = 0;
  recoil = 0;
  speed = 0;
  /** 0 standing … 1 fully crouched (smoothed). */
  crouch = 0;

  constructor(private world: World, private ev: PlayerEvents) {}

  spawn(x: number, z: number, angleDeg: number): void {
    this.pos.set(x, 0, z);
    this.pos.y = this.world.groundAt(x, z, this.radius, 50, 100);
    this.vel.setAll(0);
    this.yaw = (angleDeg * Math.PI) / 180;
    this.pitch = 0;
    this.dead = false;
    this.eyeSmooth = 0;
    this.crouch = 0;
    this.height = PLAYER.height;
  }

  get eye(): Vector3 {
    return new Vector3(this.pos.x, this.eyeY, this.pos.z);
  }

  get eyeY(): number {
    if (this.dead) return this.pos.y + Math.max(0.28, PLAYER.eye - this.deathTime * 2.4);
    const bob = Math.sin(this.bobPhase * 2) * 0.045 * this.bobAmount;
    return this.pos.y + PLAYER.eye - PLAYER.crouchEyeDrop * this.crouch + this.eyeSmooth + bob - this.landDip;
  }

  get forward(): Vector3 {
    const cp = Math.cos(this.pitch);
    return new Vector3(Math.sin(this.yaw) * cp, -Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  get state(): PlayerState {
    return { health: this.health, armor: this.armor, ammo: { ...this.ammo }, weapons: [...this.weapons], keys: [...this.keys] };
  }

  applyState(s: PlayerState): void {
    this.health = s.health;
    this.armor = s.armor;
    this.ammo = Object.assign({ bullets: 0, shells: 0, rounds: 0, grenades: 0 }, s.ammo);
    this.weapons = new Set(s.weapons);
    this.keys = new Set(s.keys);
  }

  addAmmo(type: AmmoType, n: number): boolean {
    if (this.ammo[type] >= AMMO_MAX[type]) return false;
    this.ammo[type] = Math.min(AMMO_MAX[type], this.ammo[type] + n);
    return true;
  }

  look(input: Input, s: Settings): void {
    const k = 0.0021 * s.sensitivity;
    this.yaw += input.mouseDX * k;
    this.pitch += input.mouseDY * k * (s.invertY ? -1 : 1);
    this.pitch = clamp(this.pitch, -PLAYER.pitchLimit, PLAYER.pitchLimit);
  }

  update(dt: number, input: Input, s: Settings): void {
    if (this.dead) {
      this.deathTime += dt;
      this.roll = damp(this.roll, 0.35, 4, dt);
      this.vel.scaleInPlace(Math.exp(-6 * dt));
      this.world.move(this, this.vel.x * dt, this.vel.z * dt, PLAYER.stepHeight);
      return;
    }
    this.look(input, s);
    // recoil recovers toward zero
    this.recoil = damp(this.recoil, 0, 9, dt);

    const fwd = (input.isDown('forward') ? 1 : 0) - (input.isDown('back') ? 1 : 0);
    const str = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let wx = sy * fwd + cy * str;
    let wz = cy * fwd - sy * str;
    const wl = Math.hypot(wx, wz);
    if (wl > 0) {
      wx /= wl;
      wz /= wl;
    }
    // crouch: hold to duck; stays down under low ceilings
    let wantCrouch = input.isDown('crouch') && !this.noclip;
    if (!wantCrouch && this.crouch > 0.05) {
      const ceil = this.world.ceilAt(this.pos.x, this.pos.z, this.radius * 0.8);
      if (ceil < this.pos.y + PLAYER.height) wantCrouch = true;
    }
    this.crouch = damp(this.crouch, wantCrouch ? 1 : 0, 12, dt);
    if (Math.abs(this.crouch - (wantCrouch ? 1 : 0)) < 0.01) this.crouch = wantCrouch ? 1 : 0;
    this.height = PLAYER.height - (PLAYER.height - PLAYER.crouchHeight) * this.crouch;
    const sprint = input.isDown('sprint') && this.crouch < 0.3;
    const maxSpeed = PLAYER.walkSpeed * (sprint ? PLAYER.sprintMul : 1) * (1 - (1 - PLAYER.crouchSpeedMul) * this.crouch);

    if (this.noclip) {
      const f = this.forward;
      const sp = maxSpeed * 1.6;
      this.pos.x += (f.x * fwd + cy * str) * sp * dt;
      this.pos.z += (f.z * fwd - sy * str) * sp * dt;
      this.pos.y += f.y * fwd * sp * dt + ((input.isDown('jump') ? 1 : 0) - (input.isDown('sprint') && fwd === 0 ? 1 : 0)) * sp * dt;
      this.vel.setAll(0);
      return;
    }

    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround) {
      // friction
      const drop = hv * PLAYER.friction * dt;
      const ns = Math.max(0, hv - Math.max(drop, wl === 0 ? 2.5 * dt : 0));
      if (hv > 0) {
        this.vel.x *= ns / hv;
        this.vel.z *= ns / hv;
      }
      // accelerate
      const cur = this.vel.x * wx + this.vel.z * wz;
      const add = Math.min(Math.max(maxSpeed - cur, 0), PLAYER.accel * dt);
      this.vel.x += wx * add;
      this.vel.z += wz * add;
      if (input.pressed('jump')) {
        this.vel.y = PLAYER.jumpVel;
        this.onGround = false;
        this.ev.onJump();
      }
    } else {
      const cur = this.vel.x * wx + this.vel.z * wz;
      const add = Math.min(Math.max(maxSpeed - cur, 0), PLAYER.airAccel * dt);
      this.vel.x += wx * add;
      this.vel.z += wz * add;
    }

    const prevY = this.pos.y;
    this.world.move(this, this.vel.x * dt, this.vel.z * dt, PLAYER.stepHeight);
    this.speed = Math.hypot(this.vel.x, this.vel.z);

    // vertical
    const ground = this.world.groundAt(this.pos.x, this.pos.z, this.radius, this.pos.y, PLAYER.stepHeight);
    if (this.onGround) {
      if (ground < this.pos.y - PLAYER.stepHeight) {
        this.onGround = false; // walked off a ledge
        this.vel.y = 0;
      } else {
        this.pos.y = ground; // follow steps and lifts
      }
    }
    if (!this.onGround) {
      this.vel.y -= PLAYER.gravity * dt;
      this.pos.y += this.vel.y * dt;
      const ceil = this.world.ceilAt(this.pos.x, this.pos.z, this.radius * 0.8);
      if (this.pos.y + this.height > ceil && this.vel.y > 0) {
        this.pos.y = ceil - this.height;
        this.vel.y = 0;
      }
      const g2 = this.world.groundAt(this.pos.x, this.pos.z, this.radius, this.pos.y, PLAYER.stepHeight);
      if (this.pos.y <= g2) {
        const impact = -this.vel.y;
        this.pos.y = g2;
        this.vel.y = 0;
        this.onGround = true;
        if (impact > 3) {
          this.landDip = Math.min(0.35, impact * 0.025);
          this.ev.onLand(impact);
        }
      }
    }
    // smooth step-ups so the camera does not snap
    const dy = this.pos.y - prevY;
    if (this.onGround && Math.abs(dy) > 0.06 && Math.abs(dy) <= PLAYER.stepHeight + 0.01) this.eyeSmooth -= dy;
    this.eyeSmooth = damp(this.eyeSmooth, 0, 14, dt);
    this.landDip = damp(this.landDip, 0, 8, dt);

    // head bob + footsteps
    const moving = this.onGround && this.speed > 0.5;
    this.bobAmount = damp(this.bobAmount, moving ? Math.min(1, this.speed / PLAYER.walkSpeed) : 0, 10, dt);
    if (moving) {
      this.bobPhase += dt * (this.speed * 1.05);
      this.stepDist += this.speed * dt;
      const stride = sprint ? 2.6 : 2.2;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        const i = this.world.grid.cellAt(this.pos.x, this.pos.z);
        const z = this.world.grid.zoneOf(i);
        const kind = i >= 0 ? this.world.grid.kind[i] : 0;
        const metal = kind === CellKind.Lift || z?.floorTex === 'floorGrate' || z?.floorTex === 'hangarFloor';
        this.ev.onStep(metal, kind === CellKind.Nukage);
      }
    }
    this.roll = damp(this.roll, -str * 0.012, 8, dt);

    // nukage burns
    const ci = this.world.grid.cellAt(this.pos.x, this.pos.z);
    if (this.onGround && ci >= 0 && this.world.grid.kind[ci] === CellKind.Nukage && this.pos.y <= this.world.grid.floor[ci] + 0.05) {
      this.nukageT += dt;
      if (this.nukageT >= PLAYER.nukageInterval) {
        this.nukageT = 0;
        this.ev.onNukage();
      }
    } else this.nukageT = Math.min(this.nukageT, PLAYER.nukageInterval * 0.6);
  }
}
