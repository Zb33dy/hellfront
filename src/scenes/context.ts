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

export type DamageKind = 'bullet' | 'pellet' | 'melee' | 'fireball' | 'blast' | 'saw';

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
  damagePlayer(amount: number, from: Vector3, kind: DamageKind): void;
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
  /** Spawns a monster mid-fight (boss summons). World coordinates. */
  summon(kind: EnemyKind, x: number, z: number): Enemy | null;
  /** Adds velocity to the player (shockwaves). */
  pushPlayer(v: Vector3): void;
  /** Telegraphed ground eruption: warning for `delay` seconds, then damages the player inside `radius`. */
  hazard(pos: Vector3, delay: number, radius: number, damage: number): void;
}
