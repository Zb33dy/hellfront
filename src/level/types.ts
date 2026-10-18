import type { TileName } from '../gfx/textures';
import type { EnemyKind } from '../core/config';

/** [x, y, w, h] in grid cells. y is the map row (world +z). */
export type Rect = [number, number, number, number];
export type RGB = [number, number, number];

export interface ZoneDef {
  id: string;
  rect: Rect;
  floor: number;
  ceil: number;
  floorTex: TileName;
  ceilTex: TileName;
  wallTex: TileName;
  /** Texture used for step faces that belong to this (higher) zone. */
  stepTex?: TileName;
  ambient: RGB;
  nukage?: boolean;
  /** Molten slag instead of nukage: hotter, more damage. Requires nukage: true. */
  lava?: boolean;
}

export type DoorType = 'normal' | 'red' | 'blue' | 'yellow' | 'closet' | 'secret' | 'locked';

export interface DoorDef {
  id: string;
  rect: Rect;
  type: DoorType;
  ceil?: number;
  tex?: TileName;
}

export interface LiftDef {
  id: string;
  rect: Rect;
  low: number;
  high: number;
}

export interface BoxDef {
  rect: Rect; // may be fractional
  y0?: number;
  y1: number;
  tex: TileName;
  topTex?: TileName;
}

export type LightMode = 'static' | 'flicker' | 'pulse' | 'alarm';

export interface LightDef {
  x: number;
  y: number;
  h: number;
  color: RGB;
  intensity: number;
  range: number;
  mode?: LightMode;
  shaft?: boolean;
  fixture?: boolean;
}

export type PickupKind =
  | 'healthSmall' | 'healthLarge' | 'armor' | 'bulletClip' | 'bulletBox' | 'shells' | 'shellBox'
  | 'keyRed' | 'keyBlue' | 'keyYellow' | 'shotgun' | 'chainsword';

export type PropKind = 'barrel' | 'lamp' | 'techColumn' | 'corpse';

export type ThingKind = 'player' | EnemyKind | PickupKind | PropKind;

export interface ThingDef {
  id?: string;
  kind: ThingKind;
  x: number;
  y: number;
  angle?: number; // degrees, 0 = +z (south on the map), 90 = +x (east)
  wave?: string;
  ambush?: boolean;
  /** Difficulty flags: e = easy, n = normal, h = hard. Default "enh". */
  skill?: string;
  teleport?: boolean;
  /** Wave member that is present (not dormant) from the start. */
  awake?: boolean;
}

export type TriggerAction =
  | { do: 'voice'; id: string }
  | { do: 'objective'; key: string }
  | { do: 'wave'; id: string }
  | { do: 'openDoor'; id: string }
  | { do: 'closeDoor'; id: string; lock?: boolean }
  | { do: 'unlockDoor'; id: string }
  | { do: 'checkpoint'; id: string }
  | { do: 'message'; key: string }
  | { do: 'exit' };

export type TriggerWhen =
  | { enter: Rect }
  | { pickup: string }
  | { waveCleared: string }
  | { start: true };

export interface TriggerDef {
  id: string;
  when: TriggerWhen;
  actions: TriggerAction[];
  delay?: number;
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
  angle: number;
}

export interface SecretDef {
  id: string;
  rect: Rect;
}

export interface Loadout {
  weapons: ('pistol' | 'shotgun' | 'chainsword')[];
  bullets: number;
  shells: number;
  health: number;
  armor: number;
}

export interface LevelData {
  id: string;
  chapter: number;
  /** i18n keys */
  titleKey: string;
  introKey: string;
  outroKey: string;
  next: string | null;
  /** Loadout when the chapter is started directly (chapter select). */
  startLoadout: Loadout;
  completeVoice: string;
  ambience: { nukage?: [number, number]; alarm?: boolean };
  dust?: Rect;
  fogColor?: RGB;
  width: number;
  height: number;
  defaultWall: TileName;
  zones: ZoneDef[];
  solids: { rect: Rect; tex: TileName }[];
  wallPaint: { rect: Rect; tex: TileName }[];
  doors: DoorDef[];
  lifts: LiftDef[];
  boxes: BoxDef[];
  lights: LightDef[];
  things: ThingDef[];
  triggers: TriggerDef[];
  checkpoints: CheckpointDef[];
  secrets: SecretDef[];
  parTime: number;
  menuPath: [number, number, number][]; // cell x, cell y, height
}
