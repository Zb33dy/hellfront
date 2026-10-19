import { Vector3 } from '@babylonjs/core';
import { ENEMIES, type EnemyDef, type EnemyKind } from '../core/config';
import { rand } from '../core/util';
import type { SoundId } from '../audio/audioManifest';
import type { DamageKind, GameCtx } from '../scenes/context';

export type AIState = 'dormant' | 'idle' | 'alert' | 'chase' | 'attack' | 'pain' | 'dying' | 'dead';

export interface EnemySounds {
  alert: SoundId;
  pain: SoundId;
  death: SoundId;
  idle?: SoundId;
  /** Pitch shift so new monsters get their own voice from shared samples. */
  pitch?: number;
}

/** Shared monster body + state. Behaviour lives in ai/enemyAI.ts, attacks in the subclasses. */
export abstract class Enemy {
  abstract readonly kind: EnemyKind;
  abstract readonly sounds: EnemySounds;
  readonly def: EnemyDef;
  readonly pos = new Vector3();
  readonly knock = new Vector3();
  vy = 0;
  yaw = 0;
  hp: number;
  maxHp: number;
  radius: number;
  height: number;
  state: AIState = 'idle';
  stateT = 0;
  animT = Math.random() * 10;
  attackCD = rand(0.5, 1.5);
  attackT = 0;
  attackPhase = 0;
  painFlash = 0;
  gibbed = false;
  deathT = 0;
  seesPlayer = false;
  seeCheckT = Math.random() * 0.3;
  lastSeen: Vector3 | null = null;
  strafe = 0;
  strafeT = 0;
  idleSoundT = rand(3, 9);
  moving = false;
  flip = false;
  ambush = false;
  wave: string | undefined;
  teleport = false;
  /** index into the level thing list (save games). */
  spawnIndex = -1;
  readonly spawn = new Vector3();
  spawnYaw = 0;
  stuckT = 0;
  nudgeT = 0;
  hpMul = 1;
  /** Glory-kill window: staggered enemies freeze and glow; E executes them. */
  staggerT = 0;
  staggered = false;
  /** >0 while a parriable (blue) attack winds up; drawn blue. */
  parryTell = 0;
  /** >0 while an unblockable (red) attack winds up; drawn red. */
  dangerTell = 0;
  /** Gallery exhibit: no AI, no damage. */
  frozen = false;
  /** Siege 'swift' modifier. */
  speedMul = 1;
  /** Direction of the killing blow (corpse falls away from it). */
  readonly deathDir = new Vector3();
  /** Flyers: current hover height above the floor. */
  hover = 0;
  /** Burning (upgrade effects): seconds left and damage per second. */
  burnT = 0;
  burnDps = 0;

  constructor(kind: EnemyKind, x: number, z: number, angleDeg: number, hpMul: number) {
    this.def = ENEMIES[kind];
    this.hpMul = hpMul;
    this.hp = this.maxHp = Math.round(this.def.hp * hpMul);
    this.radius = this.def.radius;
    this.height = this.def.height;
    this.pos.set(x, 0, z);
    this.spawn.set(x, 0, z);
    this.yaw = (angleDeg * Math.PI) / 180;
    this.spawnYaw = this.yaw;
    this.hover = this.def.fly ?? 0;
  }

  get alive(): boolean {
    return this.state !== 'dying' && this.state !== 'dead' && this.state !== 'dormant';
  }

  get solid(): boolean {
    return this.state !== 'dying' && this.state !== 'dead' && this.state !== 'dormant';
  }

  /** Chest-height point used for aiming and line of sight. */
  get eye(): Vector3 {
    return new Vector3(this.pos.x, this.pos.y + this.height * 0.75, this.pos.z);
  }

  setState(s: AIState): void {
    this.state = s;
    this.stateT = 0;
    this.attackPhase = 0;
    this.attackT = 0;
  }

  /** Begins an attack if conditions allow. */
  abstract tryAttack(ctx: GameCtx, dist: number, los: boolean): boolean;
  /** Advances the current attack; returns false when it is over. */
  abstract updateAttack(dt: number, ctx: GameCtx, dist: number): boolean;
  /** Attack animation frame name, or null to use the default. */
  abstract attackFrame(): string;

  /** Speed multiplier while chasing (pinky charges override it). */
  chaseSpeed(): number {
    return this.def.speed;
  }

  frame(): string {
    const k = this.kind;
    switch (this.state) {
      case 'dying':
      case 'dead': {
        const n = this.gibbed ? 4 : 5;
        const i = Math.min(n - 1, Math.floor(this.deathT / (this.gibbed ? 0.1 : 0.13)));
        return `${k}_${this.gibbed ? 'gib' : 'die'}${i}`;
      }
      case 'pain':
        return `${k}_pain`;
      case 'attack':
        return this.attackFrame();
      case 'chase':
        if (this.moving) return `${k}_walk${Math.floor(this.animT * (this.def.speed * 1.5)) % 4}`;
        return `${k}_idle`;
      default:
        return `${k}_idle`;
    }
  }

  damage(amount: number, dir: Vector3, kind: DamageKind, ctx: GameCtx): void {
    if (!this.alive || this.frozen) return;
    if (!ctx.piercingShot) amount *= this.def.dmgMul?.[kind] ?? 1;
    this.hp -= amount;
    this.painFlash = 0.12;
    const mass = this.def.mass ?? (this.kind === 'imp' ? 0.7 : 1);
    this.knock.addInPlace(new Vector3(dir.x, 0, dir.z).normalize().scale(Math.min(amount, 60) * 0.11 * mass));
    if (this.hp <= 0) {
      const over = -this.hp;
      // the body goes where the hit sends it: explosions launch, heavy hits throw it back
      const fling = Math.min(amount, 160) * 0.09 * mass + 2.5;
      this.knock.addInPlace(new Vector3(dir.x, 0, dir.z).normalize().scale(fling));
      if (kind === 'blast' && !this.def.bossName) {
        this.vy = 4 + Math.min(amount, 220) / 45;
        this.pos.y += 0.06;
      }
      this.deathDir.copyFrom(dir);
      this.gibbed = over >= this.def.gibThreshold || (kind === 'blast' && over >= this.def.gibThreshold * 0.5) || (kind === 'saw' && this.kind !== 'pinky' && over > 4 && Math.random() < 0.3);
      this.setState('dying');
      this.deathT = 0;
      ctx.sound(this.gibbed ? 'gib' : this.sounds.death, this.pos, { pitch: this.gibbed ? 1 : this.sounds.pitch });
      if (this.gibbed) ctx.sound(this.sounds.death, this.pos, { volume: 0.6 });
      return;
    }
    if (this.state === 'idle' || this.state === 'alert') {
      this.lastSeen = ctx.player.pos.clone();
      this.alertNow(ctx);
    }
    const resist = this.state === 'attack' && this.kind === 'pinky' && this.attackPhase === 2;
    if (!resist && Math.random() < this.def.painChance) {
      this.setState('pain');
      ctx.sound(this.sounds.pain, this.pos, { pitch: this.sounds.pitch });
    }
  }

  alertNow(ctx: GameCtx): void {
    if (this.state === 'dormant' || !this.alive) return;
    if (this.state === 'idle') {
      this.setState('alert');
      ctx.sound(this.sounds.alert, this.pos, { pitch: this.sounds.pitch });
    }
  }
}
