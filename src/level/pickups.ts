import type { Vector3 } from '@babylonjs/core';
import { PICKUPS, type KeyColor } from '../core/config';
import type { SoundId } from '../audio/audioManifest';
import type { Player } from '../entities/player';
import type { PickupKind } from './types';

export interface Pickup {
  kind: PickupKind;
  pos: Vector3;
  id?: string;
  taken: boolean;
  counts: boolean; // counts toward item %
  index: number;
  phase: number;
}

export interface PickupResult {
  msg: string;
  sound: SoundId;
  flash: 'gold';
  weapon?: 'shotgun' | 'chainsword' | 'sniper' | 'launcher' | 'bolter' | 'flamer';
}

/** Applies a pickup to the player. Returns null if it can't be taken (e.g. full health). */
export function applyPickup(kind: PickupKind, p: Player, ammoMul: number): PickupResult | null {
  const am = (n: number) => Math.max(1, Math.round(n * ammoMul));
  switch (kind) {
    case 'healthSmall':
      if (p.health >= p.maxHealth) return null;
      p.health = Math.min(p.maxHealth, p.health + PICKUPS.healthSmall);
      return { msg: 'msg.healthSmall', sound: 'pickup_health', flash: 'gold' };
    case 'healthLarge':
      if (p.health >= p.maxHealth) return null;
      p.health = Math.min(p.maxHealth, p.health + PICKUPS.healthLarge);
      return { msg: 'msg.healthLarge', sound: 'pickup_health', flash: 'gold' };
    case 'armor':
      if (p.armor >= PICKUPS.armor) return null;
      p.armor = PICKUPS.armor;
      return { msg: 'msg.armor', sound: 'pickup_armor', flash: 'gold' };
    case 'bulletClip':
      return p.addAmmo('bullets', am(PICKUPS.bulletClip)) ? { msg: 'msg.bulletClip', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'bulletBox':
      return p.addAmmo('bullets', am(PICKUPS.bulletBox)) ? { msg: 'msg.bulletBox', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'shells':
      return p.addAmmo('shells', am(PICKUPS.shells)) ? { msg: 'msg.shells', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'shellBox':
      return p.addAmmo('shells', am(PICKUPS.shellBox)) ? { msg: 'msg.shellBox', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'keyRed':
    case 'keyBlue':
    case 'keyYellow': {
      const k: KeyColor = kind === 'keyRed' ? 'red' : kind === 'keyBlue' ? 'blue' : 'yellow';
      p.keys.add(k);
      return { msg: 'msg.' + kind, sound: 'pickup_key', flash: 'gold' };
    }
    case 'shotgun': {
      const had = p.weapons.has('shotgun');
      p.weapons.add('shotgun');
      p.addAmmo('shells', am(PICKUPS.shotgunShells));
      return { msg: 'msg.shotgun', sound: 'pickup_weapon', flash: 'gold', weapon: had ? undefined : 'shotgun' };
    }
    case 'rounds':
      return p.addAmmo('rounds', am(PICKUPS.rounds)) ? { msg: 'msg.rounds', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'grenades':
      return p.addAmmo('grenades', PICKUPS.grenades) ? { msg: 'msg.grenades', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'rockets':
      return p.addAmmo('rockets', am(PICKUPS.rockets)) ? { msg: 'msg.rockets', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'bolts':
      return p.addAmmo('bolts', am(PICKUPS.bolts)) ? { msg: 'msg.bolts', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'fuel':
      return p.addAmmo('fuel', am(PICKUPS.fuel)) ? { msg: 'msg.fuel', sound: 'pickup_ammo', flash: 'gold' } : null;
    case 'bolter':
    case 'flamer': {
      const had = p.weapons.has(kind);
      p.weapons.add(kind);
      p.addAmmo(kind === 'bolter' ? 'bolts' : 'fuel', am(kind === 'bolter' ? PICKUPS.bolterBolts : PICKUPS.flamerFuel));
      return { msg: 'msg.' + kind, sound: 'pickup_weapon', flash: 'gold', weapon: had ? undefined : kind };
    }
    case 'launcher': {
      const had = p.weapons.has('launcher');
      p.weapons.add('launcher');
      p.addAmmo('rockets', am(PICKUPS.launcherRockets));
      return { msg: 'msg.launcher', sound: 'pickup_weapon', flash: 'gold', weapon: had ? undefined : 'launcher' };
    }
    case 'sniper': {
      const had = p.weapons.has('sniper');
      p.weapons.add('sniper');
      p.addAmmo('rounds', am(PICKUPS.sniperRounds));
      return { msg: 'msg.sniper', sound: 'pickup_weapon', flash: 'gold', weapon: had ? undefined : 'sniper' };
    }
    case 'chainsword': {
      const had = p.weapons.has('chainsword');
      p.weapons.add('chainsword');
      return { msg: 'msg.chainsword', sound: 'pickup_weapon', flash: 'gold', weapon: had ? undefined : 'chainsword' };
    }
  }
}

export const PICKUP_SCALE: Partial<Record<PickupKind, number>> = { keyRed: 1.1, keyBlue: 1.1, keyYellow: 1.1, armor: 1.1, sniper: 1.15, launcher: 1.15, bolter: 1.1, flamer: 1.1 };
