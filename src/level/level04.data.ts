import type { LevelData, LightDef, RGB, ThingDef } from './types';

// Chapter 4 — "The Ashen Gate". The other side of the breach:
// ash field → ruined Aurora expedition camp (domes) → expedition lab (red seal)
// → red gate → bone pit (blue seal) → blue gate → lava causeway → the citadel gate.

const ASH: RGB = [0.85, 0.7, 0.6];
const SLAG: RGB = [1, 0.3, 0.06];
const RED: RGB = [1, 0.14, 0.08];
const SICK: RGB = [0.5, 1, 0.75];
const LAB: RGB = [0.75, 0.85, 1];

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});

const things: ThingDef[] = [
  { kind: 'player', x: 10.5, y: 54, angle: 180 },

  // Ash field
  { kind: 'shells', x: 5, y: 55 },
  { kind: 'bulletBox', x: 16, y: 55 },
  { kind: 'healthSmall', x: 10.5, y: 48 },
  { kind: 'imp', x: 16, y: 47.5, angle: 0, skill: 'nh' },

  // Expedition camp
  { kind: 'zombieman', x: 6, y: 38, angle: 0 },
  { kind: 'zombieman', x: 19, y: 39, angle: 0 },
  { kind: 'imp', x: 13, y: 30, angle: 0 },
  { kind: 'imp', x: 4.5, y: 28, angle: 90, skill: 'nh' },
  { kind: 'wraith', x: 17, y: 30, angle: 0 },
  { kind: 'wraith', x: 8, y: 31, angle: 0, skill: 'h' },
  { kind: 'pinky', x: 12, y: 35, angle: 0 },
  { kind: 'healthSmall', x: 4.5, y: 42.5 },
  { kind: 'healthSmall', x: 21.5, y: 42.5 },
  { kind: 'shells', x: 11.5, y: 27.5 },
  { kind: 'bulletClip', x: 21.5, y: 27.5 },
  { kind: 'armor', x: 4.5, y: 33.5 },
  { kind: 'grenades', x: 21.5, y: 33 },
  { kind: 'barrel', x: 15.2, y: 41.6 },
  { kind: 'barrel', x: 15.9, y: 42.3 },
  { kind: 'lamp', x: 9.4, y: 36.4 },
  { kind: 'lamp', x: 16.6, y: 36.4 },

  // Expedition lab
  { id: 'i_keyRed', kind: 'keyRed', x: 30, y: 32 },
  { kind: 'healthLarge', x: 25, y: 29 },
  { kind: 'shellBox', x: 30.5, y: 34.5 },
  { kind: 'wraith', x: 25.5, y: 34.5, wave: 'lab', teleport: true },
  { kind: 'wraith', x: 30.5, y: 29, wave: 'lab', teleport: true, skill: 'nh' },
  { kind: 'zombieman', x: 27.5, y: 31.5, wave: 'lab', teleport: true },
  { kind: 'techColumn', x: 24.6, y: 28.6 },
  { kind: 'techColumn', x: 31.4, y: 35.4 },

  // Bone corridor + pit
  { kind: 'healthSmall', x: 21, y: 20 },
  { kind: 'ironclad', x: 8, y: 9, angle: 0 },
  { kind: 'executioner', x: 19, y: 8, angle: 0 },
  { kind: 'imp', x: 5, y: 15, angle: 90 },
  { kind: 'imp', x: 22.5, y: 15, angle: 270, skill: 'nh' },
  { id: 'i_keyBlue', kind: 'keyBlue', x: 14, y: 12 },
  { kind: 'healthLarge', x: 5, y: 7 },
  { kind: 'shells', x: 22.5, y: 7 },
  { kind: 'bulletBox', x: 5, y: 16.5 },
  { kind: 'wraith', x: 6, y: 11, wave: 'pit', teleport: true },
  { kind: 'wraith', x: 22, y: 11, wave: 'pit', teleport: true },
  { kind: 'wraith', x: 14, y: 7, wave: 'pit', teleport: true, skill: 'nh' },
  { kind: 'pinky', x: 14, y: 16, wave: 'pit', teleport: true },
  { kind: 'executioner', x: 10, y: 16, wave: 'pit', teleport: true, skill: 'h' },

  // Causeway
  { kind: 'healthSmall', x: 26, y: 10 },
  { kind: 'grenades', x: 26, y: 11 },
  { kind: 'shellBox', x: 26, y: 12 },
  { kind: 'executioner', x: 40, y: 11, angle: 270 },
  { kind: 'wraith', x: 33, y: 9.5, wave: 'causeway', teleport: true },
  { kind: 'wraith', x: 37, y: 12.5, wave: 'causeway', teleport: true },
  { kind: 'imp', x: 30, y: 12.5, wave: 'causeway', teleport: true },
  { kind: 'imp', x: 39, y: 9.5, wave: 'causeway', teleport: true, skill: 'nh' },
  { kind: 'ironclad', x: 35, y: 11, wave: 'causeway', teleport: true, skill: 'h' },
  { kind: 'healthLarge', x: 41, y: 9.5, skill: 'en' },
];

export const LEVEL04: LevelData = {
  id: 'level04',
  chapter: 4,
  titleKey: 'ch4.title',
  introKey: 'ch4.intro',
  outroKey: 'ch4.outro',
  next: 'level05',
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword'], bullets: 120, shells: 30, health: 100, armor: 50, grenades: 3 },
  completeVoice: 'v4_complete',
  ambience: { nukage: [33, 7], alarm: false },
  dust: [3, 26, 20, 18],
  fogColor: [0.07, 0.05, 0.05],
  width: 48,
  height: 60,
  defaultWall: 'hellstone',
  parTime: 600,
  zones: [
    { id: 'field', rect: [3, 46, 16, 12], floor: 0, ceil: 14, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.12, 0.09, 0.08] },
    { id: 'path', rect: [8, 44, 5, 2], floor: 0, ceil: 14, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.11, 0.08, 0.07] },
    { id: 'camp', rect: [3, 26, 20, 18], floor: 0, ceil: 14, floorTex: 'concrete', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hazard', ambient: [0.11, 0.09, 0.08] },
    { id: 'lab', rect: [24, 28, 8, 8], floor: 0, ceil: 4, floorTex: 'floorGrate', ceilTex: 'lightPanel', wallTex: 'metalPanel', ambient: [0.1, 0.1, 0.12] },
    { id: 'boneCor', rect: [20, 18, 2, 7], floor: 0, ceil: 4, floorTex: 'concreteBlood', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.09, 0.04, 0.04] },
    { id: 'pit', rect: [4, 6, 20, 12], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'bloodWall', stepTex: 'flesh', ambient: [0.09, 0.05, 0.05] },
    { id: 'pitRing', rect: [7, 8, 14, 8], floor: -0.5, ceil: 12, floorTex: 'concreteBlood', ceilTex: 'hellstone', wallTex: 'bloodWall', stepTex: 'flesh', ambient: [0.09, 0.05, 0.05] },
    { id: 'pitFloor', rect: [9, 10, 10, 4], floor: -1.0, ceil: 12, floorTex: 'flesh', ceilTex: 'hellstone', wallTex: 'bloodWall', stepTex: 'flesh', ambient: [0.11, 0.05, 0.05] },
    { id: 'causeway', rect: [25, 5, 17, 12], floor: -0.5, ceil: 14, floorTex: 'lava', ceilTex: 'hellstone', wallTex: 'hellstone', ambient: [0.22, 0.07, 0.03], nukage: true, lava: true },
    { id: 'walk', rect: [25, 9, 17, 4], floor: 0, ceil: 14, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'hellstone', stepTex: 'hellstone', ambient: [0.18, 0.08, 0.05] },
    { id: 'gateRoom', rect: [43, 8, 4, 6], floor: 0, ceil: 5, floorTex: 'hellstone', ceilTex: 'hellstone', wallTex: 'flesh', ambient: [0.12, 0.06, 0.08] },
    { id: 'pad', rect: [44, 10, 2, 2], floor: 0.15, ceil: 5, floorTex: 'exitPad', ceilTex: 'hellstone', wallTex: 'flesh', stepTex: 'flesh', ambient: [0.25, 0.1, 0.3] },
  ],
  solids: [
    // broken expedition pylons in the field
    { rect: [6, 50, 1, 1], tex: 'metalPanel' },
    { rect: [15, 51, 1, 1], tex: 'metalPanel' },
    // camp rock spurs
    { rect: [3, 26, 2, 2], tex: 'hellstone' },
    { rect: [21, 42, 2, 2], tex: 'hellstone' },
    // pit bone pillars
    { rect: [6, 7, 1, 1], tex: 'flesh' },
    { rect: [21, 7, 1, 1], tex: 'flesh' },
    { rect: [6, 16, 1, 1], tex: 'flesh' },
  ],
  wallPaint: [
    { rect: [24, 27, 8, 1], tex: 'computer' },
    { rect: [32, 28, 1, 8], tex: 'computer' },
    { rect: [3, 5, 20, 1], tex: 'flesh' },
    { rect: [42, 8, 1, 1], tex: 'bloodWall' },
    { rect: [42, 13, 1, 1], tex: 'bloodWall' },
  ],
  doors: [
    { id: 'd_lab', rect: [23, 31, 1, 2], type: 'normal' },
    { id: 'd_red', rect: [20, 25, 2, 1], type: 'red' },
    { id: 'd_blue', rect: [24, 10, 1, 2], type: 'blue' },
    { id: 'd_gate', rect: [42, 9, 1, 4], type: 'locked', ceil: 5 },
  ],
  lifts: [],
  boxes: [
    // expedition domes (prefab huts) in the camp
    { rect: [5, 29, 4, 3], y1: 2.6, tex: 'metalPanel', topTex: 'rust' },
    { rect: [15, 32, 4, 3], y1: 2.6, tex: 'metalPanel', topTex: 'rust' },
    { rect: [7, 38, 3, 2], y1: 2.2, tex: 'rust', topTex: 'metalPanel' },
    { rect: [17, 38, 3, 2], y1: 2.2, tex: 'rust', topTex: 'metalPanel' },
    { rect: [11, 32.4, 1.4, 1.4], y1: 1.4, tex: 'crate' },
    { rect: [12.4, 32.4, 1.4, 1.4], y1: 1.4, tex: 'crate' },
    // ash field wreckage
    { rect: [12, 49, 3, 1.4], y1: 1.6, tex: 'shipHull' },
    { rect: [4, 52, 1.4, 1.4], y1: 1.4, tex: 'crate' },
    // lab benches
    { rect: [26, 29.2, 3, 0.8], y1: 1.0, tex: 'metalPanel', topTex: 'computer' },
    { rect: [29.4, 31.6, 1.2, 0.8], y1: 0.9, tex: 'computer', topTex: 'metalPanel' },
    { rect: [26, 34.2, 3, 0.8], y1: 1.0, tex: 'metalPanel', topTex: 'computer' },
    // causeway spikes (cover)
    { rect: [30, 9, 0.8, 0.8], y1: 1.8, tex: 'flesh' },
    { rect: [36, 12.2, 0.8, 0.8], y1: 1.8, tex: 'flesh' },
  ],
  lights: [
    // black sun haze over the field and camp
    L(10.5, 51, 13, ASH, 1.4, 22, { shaft: true }),
    L(13, 34, 13, ASH, 1.5, 26, { shaft: true }),
    L(6, 41, 3, RED, 1.0, 8, { mode: 'flicker' }),
    L(19.5, 28.5, 3, SLAG, 1.2, 8, { mode: 'pulse' }),
    L(9.4, 36.4, 2.4, [1, 0.85, 0.6], 0.9, 6, { fixture: true }),
    L(16.6, 36.4, 2.4, [1, 0.85, 0.6], 0.9, 6, { fixture: true }),
    // lab: last working light panels
    L(28, 32, 3.8, LAB, 1.3, 9, { mode: 'flicker', fixture: true }),
    L(30, 32.2, 1.4, SICK, 0.7, 4),
    // bone corridor
    L(21, 21, 3.4, RED, 1.1, 7, { mode: 'pulse' }),
    // pit
    L(14, 12, 11, [1, 0.5, 0.4], 1.6, 20, { shaft: true }),
    L(14, 12, 0.5, SICK, 1.0, 7, { mode: 'pulse' }),
    L(6.5, 7.5, 3, RED, 1.0, 7, { mode: 'flicker' }),
    L(21.5, 7.5, 3, RED, 1.0, 7, { mode: 'flicker' }),
    // causeway
    L(28, 7, 0.3, SLAG, 1.8, 12, { mode: 'pulse' }),
    L(35, 15, 0.3, SLAG, 1.8, 12, { mode: 'pulse' }),
    L(39, 6.5, 0.3, SLAG, 1.6, 10, { mode: 'pulse' }),
    L(33, 11, 12, [1, 0.4, 0.3], 1.4, 22, { shaft: true }),
    // gate
    L(45, 11, 2.0, [0.8, 0.4, 1], 1.8, 9, { mode: 'pulse' }),
  ],
  things,
  triggers: [
    { id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'obj4.explore' }, { do: 'checkpoint', id: 'cp_start' }], delay: 0 },
    { id: 't_intro', when: { start: true }, actions: [{ do: 'voice', id: 'v4_intro' }], delay: 1.2 },
    { id: 't_camp', when: { enter: [3, 38, 20, 6] }, actions: [{ do: 'voice', id: 'v4_camp' }] },
    { id: 't_wraith', when: { enter: [3, 26, 20, 12] }, actions: [{ do: 'voice', id: 'v4_wraith' }], delay: 1.0 },
    { id: 't_lab', when: { enter: [24, 28, 3, 8] }, actions: [{ do: 'voice', id: 'v4_logs' }, { do: 'objective', key: 'obj4.red' }, { do: 'checkpoint', id: 'cp_lab' }] },
    { id: 't_redKey', when: { pickup: 'i_keyRed' }, actions: [{ do: 'wave', id: 'lab' }, { do: 'objective', key: 'obj4.redDoor' }, { do: 'voice', id: 'v4_redKey' }] },
    { id: 't_pit', when: { enter: [20, 18, 2, 4] }, actions: [{ do: 'checkpoint', id: 'cp_pit' }, { do: 'voice', id: 'v4_pit' }, { do: 'objective', key: 'obj4.blue' }] },
    { id: 't_blueKey', when: { pickup: 'i_keyBlue' }, actions: [{ do: 'wave', id: 'pit' }, { do: 'objective', key: 'obj4.blueDoor' }, { do: 'voice', id: 'v4_blueKey' }] },
    { id: 't_causeway', when: { enter: [25, 9, 3, 4] }, actions: [{ do: 'checkpoint', id: 'cp_causeway' }, { do: 'wave', id: 'causeway' }, { do: 'objective', key: 'obj4.exit' }, { do: 'voice', id: 'v4_causeway' }] },
    { id: 't_gate', when: { waveCleared: 'causeway' }, actions: [{ do: 'unlockDoor', id: 'd_gate' }, { do: 'openDoor', id: 'd_gate' }, { do: 'message', key: 'msg.exitOpen' }], delay: 1.0 },
    { id: 't_exit', when: { enter: [44, 10, 2, 2] }, actions: [{ do: 'exit' }] },
  ],
  checkpoints: [
    { id: 'cp_start', x: 10.5, y: 54, angle: 180 },
    { id: 'cp_lab', x: 25, y: 32, angle: 90 },
    { id: 'cp_pit', x: 21, y: 22, angle: 180 },
    { id: 'cp_causeway', x: 26, y: 11, angle: 90 },
  ],
  secrets: [],
  menuPath: [
    [10, 40, 4], [17, 34, 5], [12, 28, 6], [6, 33, 5],
  ],
};
