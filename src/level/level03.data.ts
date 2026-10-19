import type { LevelData, LightDef, RGB, ThingDef } from './types';

// Chapter 3 — "The Breach". The bottom of the Aurora shaft:
// shaft landing → ossuary (first Executioner) → rift (lava cavern, walkways, blue card on the far platform)
// → blue door → last corridor → breach chamber (the core on its lava ring) → transit pad.

const WARM: RGB = [1, 0.75, 0.5];
const SLAG: RGB = [1, 0.3, 0.06];
const RED: RGB = [1, 0.12, 0.08];
const RIFT: RGB = [0.75, 0.25, 1];
const BONE: RGB = [1, 0.88, 0.7];

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});

const things: ThingDef[] = [
  { kind: 'player', x: 7, y: 57.5, angle: 180 },

  // Shaft landing
  { kind: 'shells', x: 4.5, y: 53.5 },
  { kind: 'bulletClip', x: 9.5, y: 53.5 },
  { kind: 'healthSmall', x: 9.5, y: 58.5 },
  { kind: 'lamp', x: 3.6, y: 52.6 },
  { kind: 'lamp', x: 10.4, y: 52.6 },

  // Corridor
  { kind: 'imp', x: 7, y: 44, angle: 0 },
  { kind: 'zombieman', x: 6.5, y: 46.5, angle: 0, skill: 'nh' },

  // Secret alcove off the corridor
  { kind: 'healthLarge', x: 9.5, y: 46.5 },
  { kind: 'shellBox', x: 10.5, y: 47.5 },

  // Ossuary
  { kind: 'executioner', x: 11.5, y: 30.5, angle: 0 },
  { kind: 'imp', x: 4.5, y: 29.5, angle: 0 },
  { kind: 'imp', x: 19.5, y: 39.5, angle: 270, skill: 'nh' },
  { kind: 'zombieman', x: 18.5, y: 29.5, angle: 0 },
  { kind: 'zombieman', x: 4.5, y: 40.0, angle: 90 },
  { kind: 'ironclad', x: 15.5, y: 35.0, angle: 0, skill: 'h' },
  { kind: 'healthSmall', x: 3.6, y: 34.5 },
  { kind: 'healthSmall', x: 19.4, y: 34.5 },
  { kind: 'shells', x: 11.5, y: 40.5 },
  { kind: 'bulletBox', x: 19.5, y: 41.0 },
  { kind: 'armor', x: 4.5, y: 41.0, skill: 'en' },
  { kind: 'grenades', x: 19.5, y: 29 },
  { kind: 'barrel', x: 8.5, y: 29.0 },
  { kind: 'barrel', x: 14.5, y: 29.0 },

  // Rift
  { kind: 'imp', x: 33.5, y: 41.5, angle: 180 },
  { kind: 'imp', x: 31.8, y: 27.0, angle: 0, skill: 'nh' },
  { kind: 'executioner', x: 35.5, y: 42.5, angle: 180 },
  { kind: 'zombieman', x: 28.5, y: 34.5, angle: 270 },
  { kind: 'healthSmall', x: 36.5, y: 34.5 },
  { kind: 'shells', x: 32.0, y: 42.8 },
  { kind: 'healthLarge', x: 36.0, y: 42.8 },
  { id: 'i_keyBlue', kind: 'keyBlue', x: 35.5, y: 27.5 },
  { kind: 'imp', x: 25.5, y: 35.0, wave: 'riftAmbush', teleport: true },
  { kind: 'imp', x: 34.0, y: 31.5, wave: 'riftAmbush', teleport: true },
  { kind: 'executioner', x: 30.0, y: 34.5, wave: 'riftAmbush', teleport: true, skill: 'nh' },
  { kind: 'pinky', x: 34.0, y: 37.5, wave: 'riftAmbush', teleport: true },

  // Corridor to the breach
  { kind: 'healthLarge', x: 10.5, y: 22.5 },
  { kind: 'shellBox', x: 11.5, y: 24.5 },
  { kind: 'bulletBox', x: 10.5, y: 25.5 },

  // Breach chamber
  { kind: 'core', x: 18, y: 9, wave: 'core' },
  { kind: 'imp', x: 5.5, y: 4.5, wave: 'coreGuard', teleport: true },
  { kind: 'imp', x: 30.5, y: 4.5, wave: 'coreGuard', teleport: true },
  { kind: 'executioner', x: 18, y: 16.5, wave: 'coreGuard', teleport: true, skill: 'h' },
  { kind: 'healthSmall', x: 4.5, y: 17.5 },
  { kind: 'healthSmall', x: 31.5, y: 17.5 },
  { kind: 'healthLarge', x: 4.5, y: 3.5, skill: 'en' },
  { kind: 'shells', x: 31.5, y: 3.5 },
  { kind: 'shells', x: 11.0, y: 17.5 },
  { kind: 'bulletBox', x: 25.0, y: 17.5 },
  { kind: 'armor', x: 31.5, y: 11.0, skill: 'e' },
];

export const LEVEL03: LevelData = {
  id: 'level03',
  chapter: 3,
  titleKey: 'ch3.title',
  introKey: 'ch3.intro',
  outroKey: 'ch3.outro',
  next: 'level04',
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword'], bullets: 100, shells: 24, health: 100, armor: 50, grenades: 3 },
  completeVoice: 'v3_complete',
  ambience: { nukage: [29, 35], alarm: false },
  dust: [3, 28, 18, 14],
  fogColor: [0.06, 0.012, 0.02],
  width: 42,
  height: 62,
  defaultWall: 'hellstone',
  parTime: 540,
  zones: [
    { id: 'start', rect: [3, 52, 8, 8], floor: 0, ceil: 4.5, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'metalPanel', stepTex: 'hazard', ambient: [0.12, 0.1, 0.09] },
    { id: 'corA', rect: [6, 43, 2, 8], floor: 0, ceil: 3.5, floorTex: 'concrete', ceilTex: 'ceilPanel', wallTex: 'rust', ambient: [0.09, 0.04, 0.04] },
    { id: 'secret', rect: [9, 46, 2, 2], floor: 0, ceil: 3, floorTex: 'concreteBlood', ceilTex: 'ceilPanel', wallTex: 'bloodWall', ambient: [0.1, 0.05, 0.04] },
    { id: 'ossuary', rect: [3, 28, 18, 14], floor: 0, ceil: 7, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'hellstone', ambient: [0.09, 0.04, 0.04] },
    { id: 'rift', rect: [22, 26, 16, 18], floor: -0.5, ceil: 9, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.22, 0.07, 0.03], nukage: true, lava: true },
    { id: 'walkEW', rect: [22, 34, 16, 2], floor: 0, ceil: 9, floorTex: 'floorGrate', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.18, 0.07, 0.04] },
    { id: 'walkNS', rect: [33, 26, 2, 18], floor: 0, ceil: 9, floorTex: 'floorGrate', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.18, 0.07, 0.04] },
    { id: 'platN', rect: [31, 26, 6, 3], floor: 0.3, ceil: 9, floorTex: 'hangarFloor', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.18, 0.08, 0.06] },
    { id: 'platS', rect: [31, 41, 6, 3], floor: 0.3, ceil: 9, floorTex: 'hangarFloor', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.18, 0.08, 0.06] },
    { id: 'corB', rect: [10, 21, 2, 6], floor: 0, ceil: 3.5, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'flesh', ambient: [0.1, 0.04, 0.05] },
    { id: 'breach', rect: [3, 2, 30, 18], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'hellstone', ambient: [0.1, 0.04, 0.06] },
    { id: 'ring', rect: [14, 6, 8, 6], floor: -0.5, ceil: 12, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.25, 0.08, 0.04], nukage: true, lava: true },
    { id: 'island', rect: [16, 8, 4, 2], floor: 0.4, ceil: 12, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.25, 0.08, 0.12] },
    { id: 'exitRoom', rect: [34, 8, 4, 4], floor: 0, ceil: 4, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'techWall', ambient: [0.08, 0.12, 0.1] },
    { id: 'pad', rect: [35, 9, 2, 2], floor: 0.15, ceil: 4, floorTex: 'exitPad', ceilTex: 'lightPanel', wallTex: 'techWall', stepTex: 'hazard', ambient: [0.2, 0.4, 0.3] },
  ],
  solids: [
    // ossuary pillars
    { rect: [6, 31, 1, 1], tex: 'flesh' },
    { rect: [16, 31, 1, 1], tex: 'flesh' },
    { rect: [6, 38, 1, 1], tex: 'flesh' },
    { rect: [16, 38, 1, 1], tex: 'flesh' },
    // breach pillars
    { rect: [6, 5, 2, 2], tex: 'flesh' },
    { rect: [26, 5, 2, 2], tex: 'flesh' },
    { rect: [6, 14, 2, 2], tex: 'flesh' },
    { rect: [26, 14, 2, 2], tex: 'flesh' },
  ],
  wallPaint: [
    { rect: [2, 54, 1, 3], tex: 'lightPanel' },
    { rect: [3, 27, 7, 1], tex: 'bloodWall' },
    { rect: [12, 27, 9, 1], tex: 'bloodWall' },
    { rect: [33, 25, 2, 1], tex: 'hazard' },
    { rect: [33, 8, 1, 1], tex: 'hazard' },
    { rect: [33, 11, 1, 1], tex: 'hazard' },
    { rect: [12, 1, 12, 1], tex: 'bloodWall' },
  ],
  doors: [
    { id: 'd_start', rect: [6, 51, 2, 1], type: 'normal' },
    { id: 'd_secret', rect: [8, 46, 1, 2], type: 'secret', ceil: 3 },
    { id: 'd_oss', rect: [6, 42, 2, 1], type: 'normal' },
    { id: 'd_rift', rect: [21, 34, 1, 2], type: 'normal' },
    { id: 'd_blue', rect: [10, 27, 2, 1], type: 'blue' },
    { id: 'd_breach', rect: [10, 20, 2, 1], type: 'normal' },
    { id: 'd_exit', rect: [33, 9, 1, 2], type: 'locked' },
  ],
  lifts: [],
  boxes: [
    // landing cargo
    { rect: [3.2, 56, 1.4, 1.4], y1: 1.6, tex: 'crate' },
    { rect: [3.2, 57.4, 1.4, 1.4], y1: 1.6, tex: 'crate' },
    { rect: [9.4, 56.2, 1.4, 1.2], y1: 1.2, tex: 'crate' },
    { rect: [5, 59.3, 4, 0.6], y1: 1.0, tex: 'computer', topTex: 'metalPanel' },
    // ossuary altars
    { rect: [10.6, 34, 1.8, 1.2], y1: 1.0, tex: 'flesh', topTex: 'bloodWall' },
    { rect: [3.2, 31.5, 1.2, 2], y1: 1.2, tex: 'hellstone', topTex: 'flesh' },
    { rect: [19.6, 37.5, 1.2, 2], y1: 1.2, tex: 'hellstone', topTex: 'flesh' },
    // key pedestal
    { rect: [35.2, 27.2, 0.6, 0.6], y0: 0.3, y1: 0.8, tex: 'computer', topTex: 'metalPanel' },
    // breach debris (cover from summons)
    { rect: [10, 10, 1.6, 1.6], y1: 1.8, tex: 'hellstone' },
    { rect: [24.4, 8, 1.6, 1.6], y1: 1.8, tex: 'hellstone' },
    { rect: [12, 15, 2, 1], y1: 1.2, tex: 'metalPanel', topTex: 'hazard' },
    { rect: [22, 15, 2, 1], y1: 1.2, tex: 'metalPanel', topTex: 'hazard' },
  ],
  lights: [
    // landing
    L(5, 54, 4.2, WARM, 1.2, 9, { fixture: true }),
    L(9, 58, 4.2, WARM, 1.0, 9, { fixture: true }),
    L(7, 52.2, 3.0, RED, 1.2, 6, { mode: 'alarm' }),
    // corridor
    L(7, 47, 3.3, RED, 1.2, 8, { mode: 'flicker', fixture: true }),
    // secret
    L(10, 47, 2.6, [1, 0.35, 0.2], 0.9, 4, { mode: 'flicker' }),
    // ossuary
    L(11.5, 34.5, 6.6, BONE, 1.0, 14, { shaft: true }),
    L(6.5, 31.5, 2.5, SLAG, 1.1, 7, { mode: 'flicker' }),
    L(16.5, 31.5, 2.5, SLAG, 1.1, 7, { mode: 'flicker' }),
    L(6.5, 38.5, 2.5, SLAG, 1.1, 7, { mode: 'flicker' }),
    L(16.5, 38.5, 2.5, SLAG, 1.1, 7, { mode: 'flicker' }),
    L(11, 28.4, 3, RED, 1.0, 6, { mode: 'pulse' }),
    // rift
    L(26, 30, 0.3, SLAG, 1.8, 12, { mode: 'pulse' }),
    L(26, 40, 0.3, SLAG, 1.8, 12, { mode: 'pulse' }),
    L(36, 31, 0.3, SLAG, 1.6, 10, { mode: 'pulse' }),
    L(36, 38, 0.3, SLAG, 1.6, 10, { mode: 'pulse' }),
    L(30, 35, 8.4, RIFT, 1.4, 18, { shaft: true }),
    L(34, 27.5, 3, [0.45, 0.6, 1], 1.0, 6),
    L(34, 42.5, 3, WARM, 0.9, 6),
    // corridor B
    L(11, 23.5, 3.3, RIFT, 1.0, 7, { mode: 'pulse' }),
    // breach chamber
    L(18, 9, 1.5, RIFT, 2.4, 20, { mode: 'pulse' }),
    L(18, 9, 11.5, [1, 0.3, 0.4], 1.6, 26, { shaft: true }),
    L(5, 3.5, 5, RED, 1.2, 10, { mode: 'flicker' }),
    L(31, 3.5, 5, RED, 1.2, 10, { mode: 'flicker' }),
    L(5, 18, 5, SLAG, 1.2, 10, { mode: 'pulse' }),
    L(31, 18, 5, SLAG, 1.2, 10, { mode: 'pulse' }),
    // exit
    L(36, 10, 2.0, [0.4, 1, 0.65], 1.8, 9, { mode: 'pulse' }),
  ],
  things,
  triggers: [
    { id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'obj3.descend' }, { do: 'checkpoint', id: 'cp_start' }], delay: 0 },
    { id: 't_intro', when: { start: true }, actions: [{ do: 'voice', id: 'v3_intro' }], delay: 1.2 },
    { id: 't_exec', when: { enter: [3, 36, 18, 6] }, actions: [{ do: 'voice', id: 'v3_exec' }] },
    { id: 't_riftCp', when: { enter: [22, 34, 3, 2] }, actions: [{ do: 'checkpoint', id: 'cp_rift' }, { do: 'voice', id: 'v3_rift' }, { do: 'objective', key: 'obj3.blue' }] },
    { id: 't_key', when: { pickup: 'i_keyBlue' }, actions: [{ do: 'wave', id: 'riftAmbush' }, { do: 'objective', key: 'obj3.blueDoor' }, { do: 'voice', id: 'v3_key' }] },
    { id: 't_corridor', when: { enter: [10, 21, 2, 6] }, actions: [{ do: 'checkpoint', id: 'cp_corridor' }, { do: 'voice', id: 'v3_corridor' }] },
    { id: 't_core', when: { enter: [3, 2, 30, 16] }, actions: [{ do: 'closeDoor', id: 'd_breach', lock: true }, { do: 'wave', id: 'core' }, { do: 'wave', id: 'coreGuard' }, { do: 'objective', key: 'obj3.core' }, { do: 'voice', id: 'v3_core' }] },
    { id: 't_coreDown', when: { waveCleared: 'core' }, actions: [{ do: 'unlockDoor', id: 'd_exit' }, { do: 'openDoor', id: 'd_exit' }, { do: 'unlockDoor', id: 'd_breach' }, { do: 'message', key: 'msg.exitOpen' }, { do: 'objective', key: 'obj3.exit' }, { do: 'voice', id: 'v3_coreDown' }], delay: 1.5 },
    { id: 't_exit', when: { enter: [35, 9, 2, 2] }, actions: [{ do: 'exit' }] },
  ],
  checkpoints: [
    { id: 'cp_start', x: 7, y: 57.5, angle: 180 },
    { id: 'cp_rift', x: 23, y: 35, angle: 90 },
    { id: 'cp_corridor', x: 11, y: 25, angle: 180 },
  ],
  secrets: [{ id: 's_alcove', rect: [9, 46, 2, 2] }],
  menuPath: [
    [11, 40, 3], [5, 35, 4], [11, 30, 4.5], [18, 34, 4], [12, 38, 3],
  ],
};
