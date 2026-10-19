import type { LevelData, LightDef, RGB, ThingDef } from './types';

// Siege mode arena — "The Pit of Hell's Gate". A walled colosseum with a raised dais in the middle,
// four pillars for cover, four lava pools in the corners and eight gates the waves pour out of.

const SLAG: RGB = [1, 0.32, 0.08];
const RED: RGB = [1, 0.14, 0.08];
const GOLD: RGB = [1, 0.72, 0.35];

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});

/** Where waves appear (cell coordinates). */
export const SIEGE_SPAWNS: [number, number][] = [
  [13, 4.5], [33, 4.5], [13, 41.5], [33, 41.5], [4.5, 13], [4.5, 33], [41.5, 13], [41.5, 33],
  [23, 4.5], [23, 41.5], [4.5, 23], [41.5, 23],
];

const things: ThingDef[] = [
  { kind: 'player', x: 23, y: 23, angle: 180 },
  // supplies (respawn between rounds)
  { kind: 'healthLarge', x: 23, y: 17.5 },
  { kind: 'healthLarge', x: 23, y: 28.5 },
  { kind: 'healthSmall', x: 17.5, y: 23 },
  { kind: 'healthSmall', x: 28.5, y: 23 },
  { kind: 'shellBox', x: 9, y: 23 },
  { kind: 'shellBox', x: 37, y: 23 },
  { kind: 'bulletBox', x: 23, y: 9 },
  { kind: 'bulletBox', x: 23, y: 37 },
  { kind: 'rounds', x: 16.5, y: 16.5 },
  { kind: 'rounds', x: 29.5, y: 29.5 },
  { kind: 'grenades', x: 29.5, y: 16.5 },
  { kind: 'grenades', x: 16.5, y: 29.5 },
  { kind: 'armor', x: 23, y: 21 },
  { kind: 'rockets', x: 9, y: 9.5 },
  { kind: 'rockets', x: 37, y: 36.5 },
  { kind: 'lamp', x: 18.6, y: 18.6 },
  { kind: 'lamp', x: 27.4, y: 18.6 },
  { kind: 'lamp', x: 18.6, y: 27.4 },
  { kind: 'lamp', x: 27.4, y: 27.4 },
];

export const SIEGE: LevelData = {
  id: 'siege',
  chapter: 0,
  titleKey: 'siege.title',
  introKey: 'siege.intro',
  outroKey: 'siege.intro',
  next: null,
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword', 'sniper', 'launcher'], bullets: 150, shells: 30, rounds: 10, rockets: 6, grenades: 3, health: 100, armor: 50 },
  completeVoice: '',
  ambience: { nukage: [23, 23], alarm: false },
  dust: [3, 3, 40, 40],
  fogColor: [0.07, 0.02, 0.02],
  music: 'siege',
  width: 46,
  height: 46,
  defaultWall: 'hellstone',
  parTime: 0,
  zones: [
    { id: 'arena', rect: [3, 3, 40, 40], floor: 0, ceil: 16, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'hellstone', ambient: [0.12, 0.05, 0.05] },
    { id: 'dais', rect: [19, 19, 8, 8], floor: 0.5, ceil: 16, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.16, 0.07, 0.07] },
    { id: 'poolNW', rect: [6, 6, 5, 5], floor: -0.5, ceil: 16, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.25, 0.08, 0.03], nukage: true, lava: true },
    { id: 'poolNE', rect: [35, 6, 5, 5], floor: -0.5, ceil: 16, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.25, 0.08, 0.03], nukage: true, lava: true },
    { id: 'poolSW', rect: [6, 35, 5, 5], floor: -0.5, ceil: 16, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.25, 0.08, 0.03], nukage: true, lava: true },
    { id: 'poolSE', rect: [35, 35, 5, 5], floor: -0.5, ceil: 16, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.25, 0.08, 0.03], nukage: true, lava: true },
  ],
  solids: [
    { rect: [14, 14, 2, 2], tex: 'flesh' },
    { rect: [30, 14, 2, 2], tex: 'flesh' },
    { rect: [14, 30, 2, 2], tex: 'flesh' },
    { rect: [30, 30, 2, 2], tex: 'flesh' },
  ],
  wallPaint: [
    // the eight gates
    { rect: [12, 2, 3, 1], tex: 'bigDoor' },
    { rect: [32, 2, 3, 1], tex: 'bigDoor' },
    { rect: [12, 43, 3, 1], tex: 'bigDoor' },
    { rect: [32, 43, 3, 1], tex: 'bigDoor' },
    { rect: [2, 12, 1, 3], tex: 'bigDoor' },
    { rect: [2, 32, 1, 3], tex: 'bigDoor' },
    { rect: [43, 12, 1, 3], tex: 'bigDoor' },
    { rect: [43, 32, 1, 3], tex: 'bigDoor' },
    { rect: [21, 2, 4, 1], tex: 'bloodWall' },
    { rect: [21, 43, 4, 1], tex: 'bloodWall' },
  ],
  doors: [],
  lifts: [],
  boxes: [
    // low cover walls between the pillars
    { rect: [21, 11, 4, 0.8], y1: 1.1, tex: 'hellstone', topTex: 'flesh' },
    { rect: [21, 34.2, 4, 0.8], y1: 1.1, tex: 'hellstone', topTex: 'flesh' },
    { rect: [11, 21, 0.8, 4], y1: 1.1, tex: 'hellstone', topTex: 'flesh' },
    { rect: [34.2, 21, 0.8, 4], y1: 1.1, tex: 'hellstone', topTex: 'flesh' },
    // braziers on the dais corners
    { rect: [19.2, 19.2, 0.8, 0.8], y0: 0.5, y1: 1.4, tex: 'hellstone', topTex: 'lava' },
    { rect: [26, 19.2, 0.8, 0.8], y0: 0.5, y1: 1.4, tex: 'hellstone', topTex: 'lava' },
    { rect: [19.2, 26, 0.8, 0.8], y0: 0.5, y1: 1.4, tex: 'hellstone', topTex: 'lava' },
    { rect: [26, 26, 0.8, 0.8], y0: 0.5, y1: 1.4, tex: 'hellstone', topTex: 'lava' },
  ],
  lights: [
    L(23, 23, 15, [1, 0.4, 0.3], 2.0, 32, { shaft: true }),
    L(19.6, 19.6, 1.8, SLAG, 1.4, 8, { mode: 'flicker' }),
    L(26.4, 19.6, 1.8, SLAG, 1.4, 8, { mode: 'flicker' }),
    L(19.6, 26.4, 1.8, SLAG, 1.4, 8, { mode: 'flicker' }),
    L(26.4, 26.4, 1.8, SLAG, 1.4, 8, { mode: 'flicker' }),
    L(8.5, 8.5, 0.4, SLAG, 1.8, 11, { mode: 'pulse' }),
    L(37.5, 8.5, 0.4, SLAG, 1.8, 11, { mode: 'pulse' }),
    L(8.5, 37.5, 0.4, SLAG, 1.8, 11, { mode: 'pulse' }),
    L(37.5, 37.5, 0.4, SLAG, 1.8, 11, { mode: 'pulse' }),
    L(13.5, 4, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(33.5, 4, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(13.5, 42, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(33.5, 42, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(4, 13.5, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(4, 33.5, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(42, 13.5, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(42, 33.5, 4, RED, 1.1, 9, { mode: 'pulse' }),
    L(15, 23, 5, GOLD, 1.0, 10, { mode: 'flicker' }),
    L(31, 23, 5, GOLD, 1.0, 10, { mode: 'flicker' }),
  ],
  things,
  triggers: [],
  checkpoints: [{ id: 'cp_start', x: 23, y: 23, angle: 180 }],
  secrets: [],
  menuPath: [[23, 30, 4], [30, 23, 5], [23, 16, 6], [16, 23, 5]],
};
