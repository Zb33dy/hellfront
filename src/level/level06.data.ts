import type { LevelData, LightDef, RGB, ThingDef } from './types';

// Chapter 6 — "The Heart". A week after the shaft was sealed, it cracks open again.
// Landing → lava causeway (flyers over the slag, two islands for the daring) → the gauntlet
// (every horror at once) → antechamber → the Archon's arena → the last window home.

const SLAG: RGB = [1, 0.3, 0.06];
const RED: RGB = [1, 0.12, 0.08];
const GOLD: RGB = [1, 0.75, 0.35];
const HEART: RGB = [1, 0.45, 0.15];
const WINDOW: RGB = [0.55, 0.85, 1];

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});

const things: ThingDef[] = [
  { kind: 'player', x: 20, y: 68, angle: 180 },

  // Landing
  { kind: 'healthLarge', x: 16, y: 65 },
  { kind: 'shellBox', x: 24, y: 65 },
  { kind: 'bulletBox', x: 16, y: 70 },
  { kind: 'rockets', x: 24, y: 70 },
  { kind: 'armor', x: 20, y: 64.5, skill: 'en' },
  { kind: 'grenades', x: 22, y: 69 },
  { kind: 'rounds', x: 18, y: 69 },

  // Lava causeway: flyers over the slag
  { kind: 'harrier', x: 12, y: 55, angle: 180 },
  { kind: 'harrier', x: 28, y: 52, angle: 180 },
  { kind: 'harrier', x: 20, y: 48, angle: 180, skill: 'nh' },
  { kind: 'imp', x: 19, y: 47, angle: 0 },
  { kind: 'imp', x: 21, y: 47, angle: 0, skill: 'nh' },
  { kind: 'zombieman', x: 20, y: 50, angle: 0 },
  { kind: 'shells', x: 20, y: 57 },
  { kind: 'healthSmall', x: 19, y: 53 },
  { kind: 'healthSmall', x: 21, y: 53 },
  // islands (dash-jump or rocket-jump across)
  { kind: 'armor', x: 13.5, y: 54.5 },
  { kind: 'healthLarge', x: 26.5, y: 54.5 },
  { kind: 'rockets', x: 26.5, y: 53.5 },

  // Gauntlet: the guard
  { kind: 'bulwark', x: 20, y: 38, angle: 0 },
  { kind: 'wraith', x: 10, y: 33, angle: 0 },
  { kind: 'wraith', x: 30, y: 33, angle: 0, skill: 'nh' },
  { kind: 'harrier', x: 12, y: 40, angle: 0 },
  // ...and the host that pours in once the doors seal
  { kind: 'bulwark', x: 8, y: 30, wave: 'gauntlet', teleport: true },
  { kind: 'bulwark', x: 32, y: 30, wave: 'gauntlet', teleport: true, skill: 'nh' },
  { kind: 'harrier', x: 14, y: 32, wave: 'gauntlet', teleport: true },
  { kind: 'harrier', x: 26, y: 32, wave: 'gauntlet', teleport: true },
  { kind: 'harrier', x: 20, y: 30, wave: 'gauntlet', teleport: true, skill: 'h' },
  { kind: 'boltgunner', x: 8, y: 40, wave: 'gauntlet', teleport: true },
  { kind: 'boltgunner', x: 32, y: 40, wave: 'gauntlet', teleport: true },
  { kind: 'hellflamer', x: 20, y: 31, wave: 'gauntlet', teleport: true },
  { kind: 'executioner', x: 26, y: 38, wave: 'gauntlet', teleport: true, skill: 'nh' },
  { kind: 'pinky', x: 12, y: 36, wave: 'gauntlet', teleport: true },
  { kind: 'pinky', x: 28, y: 36, wave: 'gauntlet', teleport: true },
  { kind: 'healthSmall', x: 7, y: 43 },
  { kind: 'healthSmall', x: 33, y: 43 },
  { kind: 'healthSmall', x: 7, y: 29 },
  { kind: 'healthSmall', x: 33, y: 29 },
  { kind: 'shellBox', x: 15, y: 43 },
  { kind: 'bulletBox', x: 25, y: 43 },
  { kind: 'grenades', x: 20, y: 29 },
  { kind: 'barrel', x: 11, y: 30 },
  { kind: 'barrel', x: 29, y: 30 },
  { kind: 'barrel', x: 20, y: 34 },
  // armory closet (west)
  { kind: 'bolter', x: 2, y: 34.5 },
  { kind: 'bolts', x: 2, y: 36 },
  { kind: 'flamer', x: 2.5, y: 37.5 },
  { kind: 'fuel', x: 1.6, y: 37.5 },
  { kind: 'healthLarge', x: 2, y: 33.5 },

  // Antechamber — last supplies
  { kind: 'healthLarge', x: 16.5, y: 24 },
  { kind: 'healthLarge', x: 23.5, y: 24, skill: 'en' },
  { kind: 'armor', x: 20, y: 25.5 },
  { kind: 'shellBox', x: 16.5, y: 26 },
  { kind: 'bulletBox', x: 23.5, y: 26 },
  { kind: 'rounds', x: 18, y: 24 },
  { kind: 'rockets', x: 22, y: 24 },
  { kind: 'rockets', x: 22, y: 26 },
  { kind: 'grenades', x: 18, y: 26 },
  { kind: 'bolts', x: 15.5, y: 25 },
  { kind: 'fuel', x: 24.5, y: 25 },

  // Arena
  { kind: 'archon', x: 20, y: 7, angle: 0, wave: 'boss', teleport: true },
  { kind: 'healthSmall', x: 4.5, y: 11 },
  { kind: 'healthSmall', x: 35.5, y: 11 },
  { kind: 'healthSmall', x: 13, y: 20 },
  { kind: 'healthSmall', x: 27, y: 20 },
  { kind: 'healthLarge', x: 20, y: 19, skill: 'en' },
  { kind: 'shellBox', x: 4.5, y: 14 },
  { kind: 'shells', x: 35.5, y: 14 },
  { kind: 'rockets', x: 9, y: 20 },
  { kind: 'rockets', x: 31, y: 20 },
  { kind: 'rounds', x: 4.5, y: 8 },
  { kind: 'rounds', x: 35.5, y: 8 },
  { kind: 'bolts', x: 13, y: 3 },
  { kind: 'fuel', x: 27, y: 3 },
  { kind: 'grenades', x: 20, y: 15 },
];

export const LEVEL06: LevelData = {
  id: 'level06',
  chapter: 6,
  titleKey: 'ch6.title',
  introKey: 'ch6.intro',
  outroKey: 'ch6.outro',
  next: null,
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword', 'sniper', 'launcher'], bullets: 160, shells: 40, rounds: 10, rockets: 8, health: 100, armor: 100, grenades: 4 },
  completeVoice: 'v6_complete',
  ambience: { nukage: [20, 54], alarm: false },
  dust: [3, 2, 34, 20],
  fogColor: [0.09, 0.03, 0.02],
  width: 44,
  height: 74,
  defaultWall: 'hellstone',
  parTime: 780,
  zones: [
    { id: 'landing', rect: [14, 63, 12, 9], floor: 0, ceil: 10, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.12, 0.07, 0.06] },
    { id: 'lavaPit', rect: [8, 46, 24, 16], floor: -0.5, ceil: 14, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.26, 0.09, 0.03], nukage: true, lava: true },
    { id: 'walk', rect: [18, 46, 4, 16], floor: 0, ceil: 14, floorTex: 'floorGrate', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.2, 0.09, 0.05] },
    { id: 'islandW', rect: [12, 53, 3, 3], floor: 0.6, ceil: 14, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.22, 0.1, 0.05] },
    { id: 'islandE', rect: [25, 53, 3, 3], floor: 0.6, ceil: 14, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.22, 0.1, 0.05] },
    { id: 'gauntlet', rect: [5, 28, 30, 17], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'hellstone', ambient: [0.11, 0.05, 0.05] },
    { id: 'armory', rect: [1, 33, 3, 5], floor: 0, ceil: 3.5, floorTex: 'floorGrate', ceilTex: 'lightPanel', wallTex: 'techWall', ambient: [0.12, 0.12, 0.14] },
    { id: 'ante', rect: [15, 23, 10, 4], floor: 0, ceil: 4.5, floorTex: 'hellstone', ceilTex: 'flesh', wallTex: 'flesh', ambient: [0.13, 0.08, 0.07] },
    { id: 'arena', rect: [3, 2, 34, 20], floor: 0, ceil: 18, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.12, 0.05, 0.05] },
    { id: 'dais', rect: [17, 5, 6, 4], floor: 0.5, ceil: 18, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.18, 0.07, 0.06] },
    { id: 'poolNW', rect: [5, 4, 4, 3], floor: -0.5, ceil: 18, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.26, 0.09, 0.03], nukage: true, lava: true },
    { id: 'poolNE', rect: [31, 4, 4, 3], floor: -0.5, ceil: 18, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.26, 0.09, 0.03], nukage: true, lava: true },
    { id: 'poolSW', rect: [5, 16, 4, 3], floor: -0.5, ceil: 18, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.26, 0.09, 0.03], nukage: true, lava: true },
    { id: 'poolSE', rect: [31, 16, 4, 3], floor: -0.5, ceil: 18, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.26, 0.09, 0.03], nukage: true, lava: true },
    { id: 'window', rect: [38, 10, 4, 4], floor: 0, ceil: 5, floorTex: 'floorGrate', ceilTex: 'lightPanel', wallTex: 'techWall', ambient: [0.1, 0.14, 0.18] },
    { id: 'pad', rect: [39, 11, 2, 2], floor: 0.15, ceil: 5, floorTex: 'exitPad', ceilTex: 'lightPanel', wallTex: 'techWall', stepTex: 'hazard', ambient: [0.2, 0.35, 0.45] },
  ],
  solids: [
    // gauntlet pillars (cover, and walls to run on)
    { rect: [10, 32, 1, 4], tex: 'flesh' },
    { rect: [29, 32, 1, 4], tex: 'flesh' },
    { rect: [15, 38, 2, 1], tex: 'hellstone' },
    { rect: [23, 38, 2, 1], tex: 'hellstone' },
    // arena pillars
    { rect: [11, 10, 2, 2], tex: 'flesh' },
    { rect: [27, 10, 2, 2], tex: 'flesh' },
    { rect: [11, 15, 1, 1], tex: 'hellstone' },
    { rect: [28, 15, 1, 1], tex: 'hellstone' },
  ],
  wallPaint: [
    { rect: [14, 62, 5, 1], tex: 'bloodWall' },
    { rect: [21, 62, 5, 1], tex: 'bloodWall' },
    { rect: [5, 27, 14, 1], tex: 'bloodWall' },
    { rect: [21, 27, 14, 1], tex: 'bloodWall' },
    { rect: [16, 1, 8, 1], tex: 'bloodWall' },
    { rect: [37, 10, 1, 1], tex: 'hazard' },
    { rect: [37, 13, 1, 1], tex: 'hazard' },
  ],
  doors: [
    { id: 'd_gate', rect: [19, 62, 2, 1], type: 'normal' },
    { id: 'd_hall', rect: [19, 45, 2, 1], type: 'normal' },
    { id: 'd_armory', rect: [4, 35, 1, 2], type: 'normal' },
    { id: 'd_arena', rect: [19, 27, 2, 1], type: 'locked' },
    { id: 'd_throne', rect: [19, 22, 2, 1], type: 'normal' },
    { id: 'd_exit', rect: [37, 11, 1, 2], type: 'locked' },
  ],
  lifts: [],
  boxes: [
    // landing: wreck of the drop capsule
    { rect: [15, 66, 2.5, 1.6], y1: 1.6, tex: 'shipHull', topTex: 'rust' },
    // gauntlet low cover
    { rect: [18.5, 41, 3, 1], y1: 1.1, tex: 'hellstone', topTex: 'flesh' },
    { rect: [7, 37, 1.5, 1.5], y1: 1.3, tex: 'crate' },
    { rect: [31.5, 37, 1.5, 1.5], y1: 1.3, tex: 'crate' },
    // the Archon's dais throne-spire
    { rect: [19.2, 5.2, 1.6, 1.2], y0: 0.5, y1: 4.5, tex: 'flesh', topTex: 'hellstone' },
    // arena cover blocks
    { rect: [8, 19, 2, 1], y1: 1.3, tex: 'hellstone' },
    { rect: [30, 19, 2, 1], y1: 1.3, tex: 'hellstone' },
  ],
  lights: [
    // landing
    L(20, 67, 9, [1, 0.6, 0.5], 1.3, 18, { shaft: true }),
    L(20, 63, 4, RED, 1.2, 8, { mode: 'pulse' }),
    // causeway
    L(14, 50, 0.3, SLAG, 1.9, 14, { mode: 'pulse' }),
    L(26, 58, 0.3, SLAG, 1.9, 14, { mode: 'pulse' }),
    L(20, 54, 10, [1, 0.45, 0.25], 1.4, 22, { shaft: true }),
    L(13.5, 54.5, 2.5, GOLD, 1.0, 6, { mode: 'flicker' }),
    L(26.5, 54.5, 2.5, GOLD, 1.0, 6, { mode: 'flicker' }),
    // gauntlet
    L(20, 36, 11, [1, 0.4, 0.3], 1.6, 26, { shaft: true }),
    L(10.5, 34, 3, GOLD, 1.0, 8, { mode: 'flicker' }),
    L(29.5, 34, 3, GOLD, 1.0, 8, { mode: 'flicker' }),
    L(20, 30, 4, RED, 1.2, 10, { mode: 'pulse' }),
    L(2.5, 35.5, 3, [0.7, 0.85, 1], 1.0, 6, { fixture: true }),
    // antechamber
    L(20, 25, 4, GOLD, 1.2, 9, { fixture: true }),
    // arena
    L(20, 7, 17, HEART, 2.2, 32, { shaft: true }),
    L(20, 6, 4.5, HEART, 1.8, 12, { mode: 'pulse' }),
    L(7, 5.5, 0.4, SLAG, 1.8, 10, { mode: 'pulse' }),
    L(33, 5.5, 0.4, SLAG, 1.8, 10, { mode: 'pulse' }),
    L(7, 17.5, 0.4, SLAG, 1.8, 10, { mode: 'pulse' }),
    L(33, 17.5, 0.4, SLAG, 1.8, 10, { mode: 'pulse' }),
    L(12, 13, 6, GOLD, 1.1, 12, { mode: 'flicker' }),
    L(28, 13, 6, GOLD, 1.1, 12, { mode: 'flicker' }),
    L(20, 20, 6, RED, 1.0, 12, { mode: 'pulse' }),
    // the window home
    L(40, 12, 2.4, WINDOW, 2.0, 10, { mode: 'pulse' }),
  ],
  things,
  triggers: [
    { id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'obj6.cross' }, { do: 'checkpoint', id: 'cp_start' }], delay: 0 },
    { id: 't_intro', when: { start: true }, actions: [{ do: 'voice', id: 'v6_intro' }], delay: 1.2 },
    { id: 't_lava', when: { enter: [18, 56, 4, 2] }, actions: [{ do: 'voice', id: 'v6_lava' }, { do: 'message', key: 'msg6.islands' }] },
    { id: 't_gauntlet', when: { enter: [5, 36, 30, 6] }, actions: [{ do: 'closeDoor', id: 'd_hall', lock: true }, { do: 'wave', id: 'gauntlet' }, { do: 'objective', key: 'obj6.gauntlet' }, { do: 'voice', id: 'v6_gauntlet' }, { do: 'checkpoint', id: 'cp_gauntlet' }] },
    { id: 't_cleared', when: { waveCleared: 'gauntlet' }, actions: [{ do: 'unlockDoor', id: 'd_hall' }, { do: 'unlockDoor', id: 'd_arena' }, { do: 'openDoor', id: 'd_arena' }, { do: 'objective', key: 'obj6.ante' }, { do: 'voice', id: 'v6_cleared' }], delay: 1.0 },
    { id: 't_ante', when: { enter: [15, 23, 10, 4] }, actions: [{ do: 'checkpoint', id: 'cp_ante' }] },
    { id: 't_boss', when: { enter: [3, 2, 34, 19] }, actions: [{ do: 'closeDoor', id: 'd_throne', lock: true }, { do: 'wave', id: 'boss' }, { do: 'objective', key: 'obj6.boss' }, { do: 'voice', id: 'v6_boss' }] },
    { id: 't_bossDead', when: { waveCleared: 'boss' }, actions: [{ do: 'unlockDoor', id: 'd_exit' }, { do: 'openDoor', id: 'd_exit' }, { do: 'unlockDoor', id: 'd_throne' }, { do: 'objective', key: 'obj6.exit' }, { do: 'voice', id: 'v6_dead' }], delay: 2.5 },
    { id: 't_exit', when: { enter: [39, 11, 2, 2] }, actions: [{ do: 'exit' }] },
  ],
  checkpoints: [
    { id: 'cp_start', x: 20, y: 68, angle: 180 },
    { id: 'cp_gauntlet', x: 20, y: 43, angle: 180 },
    { id: 'cp_ante', x: 20, y: 25.5, angle: 180 },
  ],
  secrets: [],
  menuPath: [
    [20, 18, 5], [12, 12, 7], [20, 9, 9], [28, 12, 7],
  ],
};
