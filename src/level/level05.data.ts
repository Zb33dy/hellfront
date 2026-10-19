import type { LevelData, LightDef, RGB, ThingDef } from './types';

// Chapter 5 — "Throne of Ash". The citadel:
// approach → gate passage → great hall → lava cloister (yellow sigil on the central altar)
// → yellow door → antechamber → throne hall (the Sovereign) → the return window.

const SLAG: RGB = [1, 0.3, 0.06];
const RED: RGB = [1, 0.12, 0.08];
const GOLD: RGB = [1, 0.75, 0.35];
const ROYAL: RGB = [1, 0.25, 0.5];
const WINDOW: RGB = [0.55, 0.85, 1];

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});

const things: ThingDef[] = [
  { kind: 'player', x: 10, y: 58, angle: 180 },

  // Approach
  { kind: 'shellBox', x: 4.5, y: 52 },
  { kind: 'bulletBox', x: 15.5, y: 52 },
  { kind: 'healthLarge', x: 10, y: 51.5 },
  { kind: 'armor', x: 4.5, y: 60, skill: 'en' },
  { kind: 'wraith', x: 10, y: 47, angle: 0 },
  { id: 'i_sniper', kind: 'sniper', x: 12, y: 57.5 },
  { kind: 'grenades', x: 15.5, y: 59 },
  { kind: 'rounds', x: 8, y: 59.5 },

  // Great hall
  { kind: 'executioner', x: 13.5, y: 32.5, angle: 0 },
  { kind: 'wraith', x: 5, y: 33, angle: 0 },
  { kind: 'wraith', x: 22, y: 33, angle: 0, skill: 'nh' },
  { kind: 'ironclad', x: 10, y: 38, angle: 0 },
  { kind: 'imp', x: 4.5, y: 43.5, angle: 90 },
  { kind: 'imp', x: 23, y: 43.5, angle: 270 },
  { kind: 'zombieman', x: 17, y: 38, angle: 0, skill: 'nh' },
  { kind: 'healthSmall', x: 4.5, y: 37.5 },
  { kind: 'healthSmall', x: 23, y: 37.5 },
  { kind: 'shells', x: 13.5, y: 44.5 },
  { kind: 'rounds', x: 4.5, y: 40 },
  { kind: 'launcher', x: 23, y: 44.5 },
  { kind: 'rockets', x: 4.5, y: 44.5 },
  { kind: 'grenades', x: 23, y: 31 },
  { kind: 'bulletClip', x: 4.5, y: 31 },
  { kind: 'barrel', x: 8.2, y: 31 },
  { kind: 'barrel', x: 18.8, y: 31 },
  { kind: 'barrel', x: 23.4, y: 40.5 },

  // Cloister
  { id: 'i_keyYellow', kind: 'keyYellow', x: 33, y: 36 },
  { kind: 'healthLarge', x: 27, y: 29 },
  { kind: 'shellBox', x: 39, y: 43 },
  { kind: 'healthSmall', x: 39, y: 29 },
  { kind: 'imp', x: 39, y: 36, angle: 270 },
  { kind: 'wraith', x: 33, y: 29, angle: 0 },
  { kind: 'wraith', x: 27, y: 43, wave: 'cloister', teleport: true },
  { kind: 'wraith', x: 39, y: 42.5, wave: 'cloister', teleport: true },
  { kind: 'executioner', x: 33, y: 29, wave: 'cloister', teleport: true, skill: 'nh' },
  { kind: 'imp', x: 39, y: 31, wave: 'cloister', teleport: true },
  { kind: 'pinky', x: 27, y: 31, wave: 'cloister', teleport: true },

  // Antechamber — last supplies
  { kind: 'healthLarge', x: 11.5, y: 25 },
  { kind: 'healthLarge', x: 14.5, y: 25, skill: 'en' },
  { kind: 'shellBox', x: 11.5, y: 27.5 },
  { kind: 'bulletBox', x: 14.5, y: 27.5 },
  { kind: 'armor', x: 13, y: 26 },
  { kind: 'rounds', x: 12.5, y: 24.5 },
  { kind: 'rounds', x: 13.5, y: 24.5 },
  { kind: 'grenades', x: 13, y: 28 },

  // Throne hall
  { kind: 'sovereign', x: 20, y: 8, angle: 0, wave: 'boss', teleport: true },
  { kind: 'healthSmall', x: 4.5, y: 21 },
  { kind: 'healthSmall', x: 35, y: 21 },
  { kind: 'healthLarge', x: 4.5, y: 10, skill: 'en' },
  { kind: 'healthLarge', x: 35, y: 10 },
  { kind: 'shellBox', x: 4.5, y: 15.5 },
  { kind: 'shells', x: 35, y: 15.5 },
  { kind: 'bulletBox', x: 20, y: 21 },
  { kind: 'armor', x: 35, y: 3, skill: 'e' },
  { kind: 'rounds', x: 4.5, y: 19 },
  { kind: 'rounds', x: 35, y: 19 },
  { kind: 'rounds', x: 20, y: 17 },
  { kind: 'rockets', x: 9, y: 21 },
  { kind: 'rockets', x: 31, y: 21 },
  { kind: 'grenades', x: 35, y: 12.5 },
  { kind: 'grenades', x: 4.5, y: 12.5 },
];

export const LEVEL05: LevelData = {
  id: 'level05',
  chapter: 5,
  titleKey: 'ch5.title',
  introKey: 'ch5.intro',
  outroKey: 'ch5.outro',
  next: 'level06',
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword'], bullets: 140, shells: 40, health: 100, armor: 75, grenades: 4 },
  completeVoice: 'v5_complete',
  ambience: { nukage: [33, 36], alarm: false },
  dust: [3, 2, 34, 21],
  fogColor: [0.07, 0.02, 0.04],
  width: 44,
  height: 64,
  defaultWall: 'hellstone',
  parTime: 660,
  zones: [
    { id: 'approach', rect: [3, 50, 14, 12], floor: 0, ceil: 14, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.12, 0.07, 0.07] },
    { id: 'gatePass', rect: [8, 46, 4, 4], floor: 0, ceil: 6, floorTex: 'hellstone', ceilTex: 'flesh', wallTex: 'flesh', ambient: [0.1, 0.05, 0.05] },
    { id: 'hall', rect: [3, 30, 22, 16], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'hellstone', ambient: [0.1, 0.05, 0.06] },
    { id: 'cloister', rect: [26, 28, 14, 16], floor: -0.5, ceil: 12, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.24, 0.08, 0.03], nukage: true, lava: true },
    { id: 'walkN', rect: [26, 28, 14, 2], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.18, 0.08, 0.05] },
    { id: 'walkS', rect: [26, 42, 14, 2], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.18, 0.08, 0.05] },
    { id: 'walkW', rect: [26, 28, 2, 16], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.18, 0.08, 0.05] },
    { id: 'walkE', rect: [38, 28, 2, 16], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.18, 0.08, 0.05] },
    { id: 'bridge', rect: [28, 35, 3, 2], floor: 0, ceil: 12, floorTex: 'floorGrate', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.2, 0.08, 0.05] },
    { id: 'altar', rect: [31, 34, 4, 4], floor: 0.3, ceil: 12, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'flesh', ambient: [0.22, 0.12, 0.06] },
    { id: 'ante', rect: [11, 24, 4, 5], floor: 0, ceil: 4, floorTex: 'hellstone', ceilTex: 'flesh', wallTex: 'flesh', ambient: [0.12, 0.08, 0.08] },
    { id: 'throne', rect: [3, 2, 34, 21], floor: 0, ceil: 16, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.1, 0.04, 0.07] },
    { id: 'dais', rect: [16, 3, 8, 4], floor: 0.5, ceil: 16, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.16, 0.06, 0.1] },
    { id: 'poolW', rect: [5, 4, 4, 4], floor: -0.5, ceil: 16, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.24, 0.08, 0.03], nukage: true, lava: true },
    { id: 'poolE', rect: [31, 4, 4, 4], floor: -0.5, ceil: 16, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.24, 0.08, 0.03], nukage: true, lava: true },
    { id: 'window', rect: [38, 10, 4, 4], floor: 0, ceil: 5, floorTex: 'floorGrate', ceilTex: 'lightPanel', wallTex: 'techWall', ambient: [0.1, 0.14, 0.18] },
    { id: 'pad', rect: [39, 11, 2, 2], floor: 0.15, ceil: 5, floorTex: 'exitPad', ceilTex: 'lightPanel', wallTex: 'techWall', stepTex: 'hazard', ambient: [0.2, 0.35, 0.45] },
  ],
  solids: [
    // hall pillars
    { rect: [7, 34, 1, 1], tex: 'flesh' },
    { rect: [19, 34, 1, 1], tex: 'flesh' },
    { rect: [7, 41, 1, 1], tex: 'flesh' },
    { rect: [19, 41, 1, 1], tex: 'flesh' },
    // throne hall pillars
    { rect: [8, 12, 2, 2], tex: 'flesh' },
    { rect: [30, 12, 2, 2], tex: 'flesh' },
    { rect: [8, 18, 2, 2], tex: 'flesh' },
    { rect: [30, 18, 2, 2], tex: 'flesh' },
    // approach rocks
    { rect: [5, 55, 1, 1], tex: 'hellstone' },
    { rect: [14, 56, 1, 1], tex: 'hellstone' },
  ],
  wallPaint: [
    { rect: [3, 49, 5, 1], tex: 'bloodWall' },
    { rect: [12, 49, 5, 1], tex: 'bloodWall' },
    { rect: [16, 1, 8, 1], tex: 'bloodWall' },
    { rect: [3, 29, 9, 1], tex: 'bloodWall' },
    { rect: [14, 29, 11, 1], tex: 'bloodWall' },
    { rect: [37, 10, 1, 1], tex: 'hazard' },
    { rect: [37, 13, 1, 1], tex: 'hazard' },
  ],
  doors: [
    { id: 'd_cloister', rect: [25, 36, 1, 2], type: 'normal' },
    { id: 'd_yellow', rect: [12, 29, 2, 1], type: 'yellow' },
    { id: 'd_throne', rect: [12, 23, 2, 1], type: 'normal' },
    { id: 'd_exit', rect: [37, 11, 1, 2], type: 'locked' },
  ],
  lifts: [],
  boxes: [
    // throne
    { rect: [18.5, 3.2, 3, 1.4], y0: 0.5, y1: 3.0, tex: 'flesh', topTex: 'hellstone' },
    { rect: [18, 3.2, 0.6, 1.4], y0: 0.5, y1: 1.6, tex: 'hellstone' },
    { rect: [21.4, 3.2, 0.6, 1.4], y0: 0.5, y1: 1.6, tex: 'hellstone' },
    // hall braziers / cover
    { rect: [12.5, 36, 2, 2], y1: 1.2, tex: 'hellstone', topTex: 'flesh' },
    { rect: [4, 46, 1.4, 1.4], y1: 1.4, tex: 'crate' },
    // approach: wreck of the Aurora crawler
    { rect: [6, 52.5, 4, 2], y1: 2.2, tex: 'shipHull', topTex: 'rust' },
    // throne hall cover blocks
    { rect: [13, 15, 2, 1], y1: 1.3, tex: 'hellstone' },
    { rect: [25, 15, 2, 1], y1: 1.3, tex: 'hellstone' },
    // altar plinth
    { rect: [32.7, 35.7, 0.6, 0.6], y0: 0.3, y1: 0.9, tex: 'hellstone', topTex: 'flesh' },
  ],
  lights: [
    // approach
    L(10, 56, 13, [1, 0.6, 0.5], 1.3, 22, { shaft: true }),
    L(10, 48, 4, RED, 1.2, 8, { mode: 'pulse' }),
    // hall
    L(13.5, 37, 11, [1, 0.45, 0.35], 1.6, 24, { shaft: true }),
    L(13.5, 37, 1.6, SLAG, 1.2, 7, { mode: 'flicker' }),
    L(7.5, 34.5, 3, GOLD, 1.0, 7, { mode: 'flicker' }),
    L(19.5, 34.5, 3, GOLD, 1.0, 7, { mode: 'flicker' }),
    L(7.5, 41.5, 3, GOLD, 1.0, 7, { mode: 'flicker' }),
    L(19.5, 41.5, 3, GOLD, 1.0, 7, { mode: 'flicker' }),
    // cloister
    L(29, 31, 0.3, SLAG, 1.8, 12, { mode: 'pulse' }),
    L(36, 40, 0.3, SLAG, 1.8, 12, { mode: 'pulse' }),
    L(33, 36, 3, [1, 0.9, 0.4], 1.2, 7),
    L(33, 36, 11, [1, 0.4, 0.25], 1.4, 20, { shaft: true }),
    // antechamber
    L(13, 26.5, 3.6, GOLD, 1.2, 7, { fixture: true }),
    // throne hall
    L(20, 5, 15, ROYAL, 2.0, 30, { shaft: true }),
    L(20, 4, 3.5, ROYAL, 1.6, 10, { mode: 'pulse' }),
    L(7, 6, 0.4, SLAG, 1.8, 11, { mode: 'pulse' }),
    L(33, 6, 0.4, SLAG, 1.8, 11, { mode: 'pulse' }),
    L(9, 15, 5, GOLD, 1.2, 12, { mode: 'flicker' }),
    L(31, 15, 5, GOLD, 1.2, 12, { mode: 'flicker' }),
    L(20, 20, 6, RED, 1.0, 12, { mode: 'pulse' }),
    // the return window
    L(40, 12, 2.4, WINDOW, 2.0, 10, { mode: 'pulse' }),
  ],
  things,
  triggers: [
    { id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'obj5.climb' }, { do: 'checkpoint', id: 'cp_start' }], delay: 0 },
    { id: 't_intro', when: { start: true }, actions: [{ do: 'voice', id: 'v5_intro' }], delay: 1.2 },
    { id: 't_hallCp', when: { enter: [8, 44, 4, 2] }, actions: [{ do: 'checkpoint', id: 'cp_hall' }] },
    { id: 't_cloister', when: { enter: [26, 34, 2, 4] }, actions: [{ do: 'voice', id: 'v5_cloister' }, { do: 'objective', key: 'obj5.yellow' }, { do: 'checkpoint', id: 'cp_cloister' }] },
    { id: 't_key', when: { pickup: 'i_keyYellow' }, actions: [{ do: 'wave', id: 'cloister' }, { do: 'objective', key: 'obj5.throne' }, { do: 'voice', id: 'v5_key' }] },
    { id: 't_sniper', when: { pickup: 'i_sniper' }, actions: [{ do: 'voice', id: 'v5_sniper' }, { do: 'message', key: 'msg.sniperHint' }] },
    { id: 't_ante', when: { enter: [11, 24, 4, 5] }, actions: [{ do: 'checkpoint', id: 'cp_ante' }] },
    { id: 't_boss', when: { enter: [3, 2, 34, 19] }, actions: [{ do: 'closeDoor', id: 'd_throne', lock: true }, { do: 'wave', id: 'boss' }, { do: 'objective', key: 'obj5.boss' }, { do: 'voice', id: 'v5_throne' }] },
    { id: 't_bossDead', when: { waveCleared: 'boss' }, actions: [{ do: 'unlockDoor', id: 'd_exit' }, { do: 'openDoor', id: 'd_exit' }, { do: 'unlockDoor', id: 'd_throne' }, { do: 'objective', key: 'obj5.exit' }, { do: 'voice', id: 'v5_dead' }], delay: 2.0 },
    { id: 't_exit', when: { enter: [39, 11, 2, 2] }, actions: [{ do: 'exit' }] },
  ],
  checkpoints: [
    { id: 'cp_start', x: 10, y: 58, angle: 180 },
    { id: 'cp_hall', x: 10, y: 45, angle: 180 },
    { id: 'cp_cloister', x: 27, y: 36.5, angle: 90 },
    { id: 'cp_ante', x: 13, y: 27.5, angle: 180 },
  ],
  secrets: [],
  menuPath: [
    [20, 18, 4], [12, 12, 6], [20, 9, 8], [28, 12, 6],
  ],
};
