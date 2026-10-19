import type { Vector3 } from '@babylonjs/core';
import type { DIFFICULTY, EnemyKind, HitscanWeaponDef, MeleeWeaponDef } from '../core/config';
import type { SoundId } from '../audio/audioManifest';
import type { PlayOpts, SoundHandle } from '../audio/audioManager';
import type { World } from '../level/world';
import type { Player } from '../entities/player';
import type { Enemy } from '../entities/enemy';
import type { Particles } from '../fx/particles';
import type { Decals } from '../fx/bloodDecals';
import type { Debris } from '../fx/debris';
import type { LightManager } from '../gfx/lightManager';
import type { ScreenShake } from '../fx/screenShake';
import type { NavField } from '../ai/navigation';
import type { Projectiles } from '../entities/projectile';
import type { PickupKind } from '../level/types';
import type { RocketOpts } from '../entities/rocket';

export type DamageKind = 'bullet' | 'pellet' | 'melee' | 'fireball' | 'blast' | 'saw' | 'flame';

export interface HitOpts {
  /** The attacker (parry / gun-strike target). */
  source?: Enemy;
  /** Blue-telegraphed melee: a well-timed parry (F) negates it and opens a Gun Strike. */
  parriable?: boolean;
  /** Red-telegraphed: cannot be parried or blocked by the protective ability. */
  unblockable?: boolean;
  /** Armor-piercing: burns through armor fast and still hurts health. */
  piercing?: boolean;
}

/** Everything entities and weapons need from the running level. */
export interface GameCtx {
  readonly world: World;
  readonly player: Player;
  readonly enemies: Enemy[];
  readonly particles: Particles;
  readonly decals: Decals;
  readonly debris: Debris;
  readonly lights: LightManager;
  readonly shake: ScreenShake;
  readonly nav: NavField;
  readonly projectiles: Projectiles;
  readonly diff: (typeof DIFFICULTY)['normal'];
  readonly time: number;
  sound(id: SoundId, pos?: Vector3 | null, opts?: PlayOpts): SoundHandle;
  lightAt(x: number, z: number): [number, number, number];
  damagePlayer(amount: number, from: Vector3, kind: DamageKind, opts?: HitOpts): void;
  /** True during an armor-piercing player shot (pistol upgrade): ignores shields and plating. */
  piercingShot: boolean;
  /** Weapon upgrade owned. */
  hasMod(id: import('../core/config').WeaponId): boolean;
  /** Sets a monster on fire for `t` seconds. */
  ignite(e: Enemy, t: number, dps: number): void;
  /** Burning ground that ignites monsters standing in it. */
  firePool(pos: Vector3, radius: number, t: number): void;
  /** True while the player is hidden from monsters (invisibility ability). */
  readonly playerHidden: boolean;
  damageEnemy(e: Enemy, amount: number, dir: Vector3, kind: DamageKind, hitPos?: Vector3): void;
  radiusDamage(center: Vector3, radius: number, damage: number, source: unknown): void;
  hitscan(origin: Vector3, dir: Vector3, range: number, damage: number, owner: Enemy | null, kind: DamageKind): void;
  noise(pos: Vector3, cells: number): void;
  spawnDrop(kind: PickupKind, pos: Vector3): void;
  playerHit(feedback: { kill: boolean }): void;
  canSeePlayer(from: Vector3): boolean;
  /** Fires the player's hitscan weapon from the eye (pellets aggregated per target). */
  playerShot(def: HitscanWeaponDef): void;
  /** Chainsword/melee sweep in front of the player. */
  playerMelee(def: MeleeWeaponDef): 'enemy' | 'wall' | 'none';
  muzzleFlash(big: boolean): void;
  /** Launches a player rocket from the eye. */
  fireRocket(opts?: RocketOpts): void;
  /** Launcher's guiding laser (right click toggles). */
  laserOn: boolean;
  /** Where the laser dot sits this frame (null when off). */
  readonly laserPoint: Vector3 | null;
  /** Chainsword whirlwind: damages everything within `radius`; returns how many were hit. */
  playerSpin(radius: number, damage: number): number;
  /** Bolter overcharge: a piercing beam that hits every monster along the aim line. */
  playerBeam(damage: number): void;
  /** Hellflamer cone in front of the player (one tick). */
  playerFlame(): void;
  /** Spawns a monster mid-fight (boss summons). World coordinates. */
  summon(kind: EnemyKind, x: number, z: number, opts?: { hpMul?: number; tracked?: boolean }): Enemy | null;
  /** Adds velocity to the player (shockwaves). */
  pushPlayer(v: Vector3): void;
  /** A boss line over the radio channel (subtitled). */
  taunt(id: string): void;
  /** Telegraphed ground eruption: warning for `delay` seconds, then damages the player inside `radius`. */
  hazard(pos: Vector3, delay: number, radius: number, damage: number): void;
}
