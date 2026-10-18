// Central tuning values. All gameplay numbers live here.

export const CELL = 2; // world units per grid cell

export const PLAYER = {
  radius: 0.42,
  height: 1.75,
  eye: 1.52,
  walkSpeed: 7.2,
  sprintMul: 1.5,
  accel: 70,
  friction: 11,
  airAccel: 14,
  jumpVel: 4.6,
  gravity: 19,
  stepHeight: 0.62,
  maxHealth: 100,
  maxArmor: 200,
  useRange: 2.6,
  pitchLimit: 1.35,
  nukageDamage: 8,
  nukageInterval: 1.0,
  fallDamageSpeed: 14,
} as const;

export type AmmoType = 'bullets' | 'shells';
export type WeaponId = 'pistol' | 'shotgun' | 'chainsword';
export type KeyColor = 'red' | 'blue' | 'yellow';

export const AMMO_MAX: Record<AmmoType, number> = { bullets: 200, shells: 50 };

export interface HitscanWeaponDef {
  kind: 'hitscan';
  ammo: AmmoType;
  ammoPerShot: number;
  pellets: number;
  damageMin: number;
  damageMax: number;
  spread: number; // radians (cone half angle)
  fireInterval: number;
  range: number;
  recoil: number; // camera kick (radians)
  shake: number;
  noise: number; // hearing radius in cells
}

export interface MeleeWeaponDef {
  kind: 'melee';
  damageMin: number;
  damageMax: number;
  range: number;
  arc: number; // radians, full angle
  fireInterval: number;
  pinkyMul: number;
  shake: number;
  noise: number;
  lunge: number;
}

export const WEAPONS: { pistol: HitscanWeaponDef; shotgun: HitscanWeaponDef; chainsword: MeleeWeaponDef } = {
  pistol: {
    kind: 'hitscan', ammo: 'bullets', ammoPerShot: 1, pellets: 1,
    damageMin: 10, damageMax: 15, spread: 0.008, fireInterval: 0.36, range: 120,
    recoil: 0.018, shake: 0.08, noise: 22,
  },
  shotgun: {
    kind: 'hitscan', ammo: 'shells', ammoPerShot: 1, pellets: 8,
    damageMin: 7, damageMax: 11, spread: 0.075, fireInterval: 0.95, range: 70,
    recoil: 0.06, shake: 0.28, noise: 28,
  },
  chainsword: {
    kind: 'melee', damageMin: 8, damageMax: 12, range: 2.3, arc: 1.1,
    fireInterval: 0.11, pinkyMul: 1.6, shake: 0.12, noise: 10, lunge: 2.0,
  },
};

export const WEAPON_SLOTS: WeaponId[] = ['pistol', 'shotgun', 'chainsword'];
export const WEAPON_SWITCH_TIME = 0.22;

export type EnemyKind = 'zombieman' | 'imp' | 'pinky';

export interface EnemyDef {
  hp: number;
  speed: number;
  radius: number;
  height: number;
  painChance: number;
  painTime: number;
  sightRange: number;
  reaction: number; // seconds from alert to first action
  meleeRange: number;
  meleeWindup: number;
  meleeDamage: [number, number];
  rangedWindup: number;
  rangedCooldown: [number, number];
  rangedDamage: [number, number];
  rangedRange: number;
  gibThreshold: number; // overkill damage that gibs
  score: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  zombieman: {
    hp: 22, speed: 3.0, radius: 0.45, height: 1.8, painChance: 0.85, painTime: 0.3,
    sightRange: 40, reaction: 0.55, meleeRange: 0, meleeWindup: 0, meleeDamage: [0, 0],
    rangedWindup: 0.55, rangedCooldown: [1.7, 3.0], rangedDamage: [3, 9], rangedRange: 34,
    gibThreshold: 18, score: 1,
  },
  imp: {
    hp: 65, speed: 3.6, radius: 0.5, height: 1.9, painChance: 0.6, painTime: 0.3,
    sightRange: 40, reaction: 0.45, meleeRange: 1.7, meleeWindup: 0.38, meleeDamage: [6, 14],
    rangedWindup: 0.6, rangedCooldown: [1.4, 2.6], rangedDamage: [9, 18], rangedRange: 30,
    gibThreshold: 30, score: 1,
  },
  pinky: {
    hp: 150, speed: 5.6, radius: 0.65, height: 1.6, painChance: 0.35, painTime: 0.35,
    sightRange: 32, reaction: 0.35, meleeRange: 1.9, meleeWindup: 0.32, meleeDamage: [10, 20],
    rangedWindup: 0, rangedCooldown: [0, 0], rangedDamage: [0, 0], rangedRange: 0,
    gibThreshold: 60, score: 1,
  },
};

export const PINKY_CHARGE = { range: 9, windup: 0.4, speed: 11.5, duration: 0.9, cooldown: [2.5, 4] as [number, number] };
export const FIREBALL = { speed: 12, radius: 0.28, life: 6 };
export const HEARING_CELLS = 20;

export const BARREL = { hp: 20, radius: 0.42, height: 1.15, blastRadius: 4.2, blastDamage: 110, chainDelay: 0.14 };

export const DOOR = { openTime: 0.55, stayOpen: 4.5, thickness: 0.45 };
export const LIFT = { speed: 2.2, wait: 0 };

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY: Record<Difficulty, { enemyDamage: number; enemyHealth: number; ammo: number; aggression: number }> = {
  easy: { enemyDamage: 0.5, enemyHealth: 0.8, ammo: 1.5, aggression: 0.75 },
  normal: { enemyDamage: 1.0, enemyHealth: 1.0, ammo: 1.0, aggression: 1.0 },
  hard: { enemyDamage: 1.4, enemyHealth: 1.2, ammo: 0.85, aggression: 1.3 },
};

export const PICKUPS = {
  healthSmall: 10,
  healthLarge: 25,
  armor: 100,
  bulletClip: 10,
  bulletBox: 50,
  shells: 4,
  shellBox: 20,
  shotgunShells: 8,
  startBullets: 50,
} as const;

export const RENDER = {
  maxDynamicLights: 8,
  fogStart: 14,
  fogEnd: 70,
  fov: 90, // default horizontal-ish FOV in degrees
};
