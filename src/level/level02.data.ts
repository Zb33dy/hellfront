import type { LevelData, LightDef, RGB, ThingDef } from './types';

// Chapter 2 — "The Foundry". Below the hangar the forge decks run hot:
// freight lift bay → slag hall (molten channel, two bridges) → east vat (yellow override on the slag island)
// → yellow door → antechamber → the Warden's arena → freight shaft to the lowest level.

const WARM: RGB = [1, 0.78, 0.55];
const ORANGE: RGB = [1, 0.45, 0.12];
const SLAG: RGB = [1, 0.32, 0.06];
const RED: RGB = [1, 0.14, 0.06];
const COOL: RGB = [0.6, 0.72, 1];

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});

const things: ThingDef[] = [
  { kind: 'player', x: 7, y: 51.5, angle: 180 },

  // Freight bay
  { kind: 'chainsword', x: 9.5, y: 48.5 },
  { kind: 'shells', x: 4.5, y: 47.5 },
  { kind: 'bulletClip', x: 9.5, y: 52.5 },
  { kind: 'healthSmall', x: 4.5, y: 52.5 },
  { kind: 'lamp', x: 3.6, y: 46.6 },
  { kind: 'lamp', x: 10.4, y: 46.6 },

  // Service corridor
  { kind: 'zombieman', x: 7, y: 38.5, angle: 0 },
  { kind: 'healthSmall', x: 6.5, y: 41.5 },

  // Slag hall — south deck
  { kind: 'zombieman', x: 12.5, y: 33.5, angle: 180 },
  { kind: 'zombieman', x: 22.5, y: 31.5, angle: 270, skill: 'nh' },
  { kind: 'imp', x: 25.0, y: 34.5, angle: 270 },
  { kind: 'bulletBox', x: 4.5, y: 34.5 },
  { kind: 'shells', x: 16.5, y: 34.8 },
  { kind: 'barrel', x: 4.4, y: 31.0 },
  { kind: 'barrel', x: 24.6, y: 30.8 },
  { kind: 'barrel', x: 25.4, y: 31.5 },
  // Slag hall — north deck (first Ironclad stands guard across the channel)
  { kind: 'ironclad', x: 12.5, y: 24.5, angle: 0 },
  { kind: 'imp', x: 23.5, y: 23.5, angle: 0 },
  { kind: 'zombieman', x: 5.5, y: 23.5, angle: 90, skill: 'nh' },
  { kind: 'ironclad', x: 20.5, y: 25.0, angle: 0, skill: 'h' },
  { kind: 'healthLarge', x: 4.5, y: 22.8 },
  { kind: 'shells', x: 25.5, y: 22.8 },
  { kind: 'barrel', x: 10.5, y: 22.6 },
  { kind: 'techColumn', x: 3.6, y: 26.2 },
  { kind: 'techColumn', x: 26.4, y: 26.2 },

  // East corridor
  { kind: 'zombieman', x: 31.5, y: 32, angle: 270 },
  { kind: 'bulletClip', x: 29.5, y: 31.5 },

  // Vat chamber
  { kind: 'imp', x: 44.5, y: 27.5, angle: 270 },
  { kind: 'imp', x: 44.5, y: 36.5, angle: 270, skill: 'nh' },
  { kind: 'ironclad', x: 35.0, y: 36.5, angle: 0 },
  { kind: 'healthSmall', x: 34.5, y: 26.5 },
  { kind: 'healthSmall', x: 45.5, y: 37.5 },
  { kind: 'shellBox', x: 45.5, y: 26.0 },
  { kind: 'armor', x: 34.5, y: 37.5, skill: 'en' },
  { id: 'i_keyYellow', kind: 'keyYellow', x: 40, y: 32 },
  { kind: 'barrel', x: 35.5, y: 27.5 },
  { kind: 'barrel', x: 44.2, y: 32.5 },
  // Vat ambush on key grab
  { kind: 'ironclad', x: 34.5, y: 30.5, wave: 'vatAmbush', teleport: true },
  { kind: 'ironclad', x: 44.5, y: 34.5, wave: 'vatAmbush', teleport: true, skill: 'nh' },
  { kind: 'imp', x: 36.5, y: 37.5, wave: 'vatAmbush', teleport: true },
  { kind: 'imp', x: 43.5, y: 26.5, wave: 'vatAmbush', teleport: true },
  { kind: 'pinky', x: 34.5, y: 33.5, wave: 'vatAmbush', teleport: true, skill: 'h' },

  // Secret: a cooling alcove behind the vat wall
  { kind: 'armor', x: 48.5, y: 31.5 },
  { kind: 'shellBox', x: 48.5, y: 32.5 },

  // Antechamber — last stop before the Warden
  { kind: 'healthLarge', x: 13.5, y: 17.5 },
  { kind: 'shellBox', x: 16.5, y: 17.5 },
  { kind: 'bulletBox', x: 13.5, y: 20.5 },
  { kind: 'armor', x: 16.5, y: 20.5 },

  // Arena
  { kind: 'warden', x: 16, y: 5, angle: 0, wave: 'boss', teleport: true },
  { kind: 'healthSmall', x: 4.5, y: 3.5 },
  { kind: 'healthSmall', x: 27.5, y: 3.5 },
  { kind: 'healthLarge', x: 4.5, y: 14.5, skill: 'en' },
  { kind: 'shells', x: 27.5, y: 14.5 },
  { kind: 'shells', x: 4.5, y: 9.0 },
  { kind: 'bulletBox', x: 27.5, y: 9.0 },
  { kind: 'healthLarge', x: 15.5, y: 14.2, skill: 'e' },
];

export const LEVEL02: LevelData = {
  id: 'level02',
  chapter: 2,
  titleKey: 'ch2.title',
  introKey: 'ch2.intro',
  outroKey: 'ch2.outro',
  next: 'level03',
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword'], bullets: 80, shells: 16, health: 100, armor: 25 },
  completeVoice: 'v2_complete',
  ambience: { nukage: [16, 28], alarm: false },
  dust: [3, 22, 24, 14],
  fogColor: [0.05, 0.02, 0.012],
  width: 50,
  height: 56,
  defaultWall: 'rust',
  parTime: 540,
  zones: [
    { id: 'start', rect: [3, 46, 8, 8], floor: 0, ceil: 4.5, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'metalPanel', stepTex: 'hazard', ambient: [0.14, 0.11, 0.09] },
    { id: 'corA', rect: [6, 37, 2, 8], floor: 0, ceil: 3.5, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'pipeWall', ambient: [0.1, 0.05, 0.03] },
    { id: 'hall', rect: [3, 22, 24, 14], floor: 0, ceil: 8, floorTex: 'concrete', ceilTex: 'ceilGrid', wallTex: 'rust', stepTex: 'hazard', ambient: [0.11, 0.06, 0.04] },
    { id: 'slag', rect: [3, 27, 24, 3], floor: -0.6, ceil: 8, floorTex: 'lava', ceilTex: 'ceilGrid', wallTex: 'rust', ambient: [0.2, 0.07, 0.02], nukage: true, lava: true },
    { id: 'bridgeW', rect: [8, 27, 2, 3], floor: 0, ceil: 8, floorTex: 'floorGrate', ceilTex: 'ceilGrid', wallTex: 'rust', stepTex: 'hazard', ambient: [0.16, 0.07, 0.03] },
    { id: 'bridgeE', rect: [19, 27, 2, 3], floor: 0, ceil: 8, floorTex: 'floorGrate', ceilTex: 'ceilGrid', wallTex: 'rust', stepTex: 'hazard', ambient: [0.16, 0.07, 0.03] },
    { id: 'eastCor', rect: [28, 31, 5, 2], floor: 0, ceil: 3.5, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'pipeWall', ambient: [0.1, 0.05, 0.03] },
    { id: 'vat', rect: [33, 25, 14, 14], floor: 0, ceil: 7, floorTex: 'concrete', ceilTex: 'ceilGrid', wallTex: 'pipeWall', stepTex: 'hazard', ambient: [0.1, 0.05, 0.03] },
    { id: 'vatPool', rect: [37, 29, 6, 6], floor: -0.6, ceil: 7, floorTex: 'lava', ceilTex: 'ceilGrid', wallTex: 'pipeWall', ambient: [0.22, 0.08, 0.02], nukage: true, lava: true },
    { id: 'vatBridge', rect: [37, 31, 2, 1], floor: 0, ceil: 7, floorTex: 'floorGrate', ceilTex: 'ceilGrid', wallTex: 'pipeWall', stepTex: 'hazard', ambient: [0.18, 0.08, 0.03] },
    { id: 'island', rect: [39, 31, 2, 2], floor: 0.3, ceil: 7, floorTex: 'hangarFloor', ceilTex: 'ceilGrid', wallTex: 'pipeWall', stepTex: 'hazard', ambient: [0.2, 0.1, 0.04] },
    { id: 'secret', rect: [48, 31, 1, 2], floor: 0, ceil: 3, floorTex: 'concreteBlood', ceilTex: 'ceilPanel', wallTex: 'bloodWall', ambient: [0.1, 0.05, 0.04] },
    { id: 'ante', rect: [13, 17, 4, 4], floor: 0, ceil: 4, floorTex: 'floorGrate', ceilTex: 'lightPanel', wallTex: 'techWall', ambient: [0.13, 0.12, 0.11] },
    { id: 'arena', rect: [3, 2, 26, 14], floor: 0, ceil: 12, floorTex: 'hellstone', ceilTex: 'ceilGrid', wallTex: 'hellstone', stepTex: 'flesh', ambient: [0.1, 0.04, 0.03] },
    { id: 'exitRoom', rect: [30, 7, 4, 4], floor: 0, ceil: 4, floorTex: 'floorGrate', ceilTex: 'ceilPanel', wallTex: 'techWall', ambient: [0.08, 0.12, 0.1] },
    { id: 'pad', rect: [31, 8, 2, 2], floor: 0.15, ceil: 4, floorTex: 'exitPad', ceilTex: 'lightPanel', wallTex: 'techWall', stepTex: 'hazard', ambient: [0.2, 0.4, 0.3] },
  ],
  solids: [
    // arena pillars
    { rect: [7, 5, 2, 2], tex: 'flesh' },
    { rect: [23, 5, 2, 2], tex: 'flesh' },
    { rect: [7, 10, 2, 2], tex: 'flesh' },
    { rect: [23, 10, 2, 2], tex: 'flesh' },
    // hall supports
    { rect: [14, 24, 1, 1], tex: 'hazard' },
    { rect: [14, 32, 1, 1], tex: 'hazard' },
  ],
  wallPaint: [
    { rect: [2, 48, 1, 3], tex: 'lightPanel' },
    { rect: [3, 21, 10, 1], tex: 'pipeWall' },
    { rect: [17, 21, 10, 1], tex: 'pipeWall' },
    { rect: [12, 21, 1, 1], tex: 'hazard' },
    { rect: [17, 21, 1, 1], tex: 'hazard' },
    { rect: [33, 24, 14, 1], tex: 'computer' },
    { rect: [12, 1, 8, 1], tex: 'bigDoor' },
    { rect: [29, 7, 1, 1], tex: 'hazard' },
    { rect: [29, 10, 1, 1], tex: 'hazard' },
    { rect: [2, 2, 1, 14], tex: 'bloodWall' },
  ],
  doors: [
    { id: 'd_start', rect: [6, 45, 2, 1], type: 'normal' },
    { id: 'd_hall', rect: [6, 36, 2, 1], type: 'normal' },
    { id: 'd_east', rect: [27, 31, 1, 2], type: 'normal' },
    { id: 'd_secret', rect: [47, 31, 1, 2], type: 'secret', ceil: 3 },
    { id: 'd_yellow', rect: [14, 21, 2, 1], type: 'yellow' },
    { id: 'd_arena', rect: [14, 16, 2, 1], type: 'normal' },
    { id: 'd_exit', rect: [29, 8, 1, 2], type: 'locked' },
  ],
  lifts: [],
  boxes: [
    // freight bay cargo
    { rect: [3.2, 50, 1.4, 1.4], y1: 1.6, tex: 'crate' },
    { rect: [3.2, 51.4, 1.4, 1.4], y1: 1.6, tex: 'crate' },
    { rect: [3.2, 50, 1.4, 1.4], y0: 1.6, y1: 3.0, tex: 'crate' },
    { rect: [9.4, 50.2, 1.4, 1.2], y1: 1.2, tex: 'crate' },
    { rect: [5, 53.3, 4, 0.6], y1: 1.0, tex: 'computer', topTex: 'metalPanel' },
    // slag hall machinery
    { rect: [3.2, 32.5, 1.6, 1.6], y1: 1.8, tex: 'rust', topTex: 'metalPanel' },
    { rect: [11, 30.4, 2.4, 0.8], y1: 1.0, tex: 'metalPanel', topTex: 'hazard' },
    { rect: [17, 30.4, 2.0, 0.8], y1: 1.0, tex: 'metalPanel', topTex: 'hazard' },
    { rect: [23, 33.2, 1.4, 1.4], y1: 1.4, tex: 'crate' },
    { rect: [7, 22.4, 1.6, 1.2], y1: 1.4, tex: 'crate' },
    { rect: [18, 22.4, 2.0, 1.0], y1: 2.0, tex: 'rust', topTex: 'metalPanel' },
    // vat chamber
    { rect: [33.2, 25.2, 1.4, 1.4], y1: 1.6, tex: 'crate' },
    { rect: [45.4, 29, 1.4, 1.6], y1: 2.2, tex: 'rust', topTex: 'metalPanel' },
    { rect: [45.4, 34, 1.4, 1.6], y1: 2.2, tex: 'rust', topTex: 'metalPanel' },
    { rect: [39.6, 31.6, 0.8, 0.8], y0: 0.3, y1: 0.8, tex: 'computer', topTex: 'metalPanel' },
    // antechamber racks
    { rect: [13, 18.4, 0.5, 1.2], y1: 2.0, tex: 'computer' },
    { rect: [16.5, 18.4, 0.5, 1.2], y1: 2.0, tex: 'computer' },
  ],
  lights: [
    // freight bay
    L(5, 48, 4.2, WARM, 1.2, 9, { fixture: true }),
    L(9, 52, 4.2, WARM, 1.1, 9, { fixture: true }),
    L(7, 46.2, 3.0, ORANGE, 1.0, 6, { mode: 'flicker' }),
    // corridor
    L(7, 40.5, 3.3, ORANGE, 1.3, 8, { mode: 'flicker', fixture: true }),
    // slag hall: the channel glows
    L(5.5, 28.5, 0.3, SLAG, 1.6, 10, { mode: 'pulse' }),
    L(14.5, 28.5, 0.3, SLAG, 1.6, 10, { mode: 'pulse' }),
    L(24.5, 28.5, 0.3, SLAG, 1.6, 10, { mode: 'pulse' }),
    L(9, 33, 7.6, WARM, 1.4, 16, { shaft: true, fixture: true }),
    L(21, 33, 7.6, WARM, 1.3, 16, { shaft: true, fixture: true }),
    L(9, 24, 7.6, WARM, 1.3, 16, { shaft: true, fixture: true }),
    L(21, 24, 7.6, WARM, 1.3, 16, { shaft: true, fixture: true }),
    L(15, 22.4, 3.0, RED, 1.2, 7, { mode: 'alarm' }),
    // east corridor
    L(30.5, 32, 3.3, RED, 1.2, 7, { mode: 'flicker', fixture: true }),
    // vat
    L(40, 32, 0.3, SLAG, 2.0, 13, { mode: 'pulse' }),
    L(35.5, 27, 6.6, ORANGE, 1.2, 12, { fixture: true }),
    L(44.5, 37, 6.6, ORANGE, 1.2, 12, { fixture: true }),
    L(44.5, 27, 6.6, ORANGE, 1.0, 10, { fixture: true }),
    L(35.5, 37, 6.6, ORANGE, 1.0, 10, { fixture: true }),
    L(40, 32, 3.0, [1, 0.9, 0.3], 1.0, 5),
    // antechamber
    L(15, 19, 3.8, [0.95, 0.95, 1], 1.4, 8, { fixture: true }),
    // arena
    L(16, 9, 11.5, [1, 0.35, 0.15], 2.0, 26, { shaft: true }),
    L(5, 4, 5, RED, 1.3, 11, { mode: 'pulse' }),
    L(27, 4, 5, RED, 1.3, 11, { mode: 'pulse' }),
    L(5, 14, 5, ORANGE, 1.2, 11, { mode: 'flicker' }),
    L(27, 14, 5, ORANGE, 1.2, 11, { mode: 'flicker' }),
    L(16, 2.6, 4, SLAG, 1.4, 10, { mode: 'pulse' }),
    // secret
    L(48.5, 32, 2.6, [1, 0.35, 0.2], 0.9, 4, { mode: 'flicker' }),
    // exit
    L(32, 9, 2.0, [0.4, 1, 0.65], 1.8, 9, { mode: 'pulse' }),
    L(31.5, 7.4, 3.6, COOL, 0.8, 6),
  ],
  things,
  triggers: [
    { id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'obj2.forge' }, { do: 'checkpoint', id: 'cp_start' }], delay: 0 },
    { id: 't_intro', when: { start: true }, actions: [{ do: 'voice', id: 'v2_intro' }], delay: 1.2 },
    { id: 't_hall', when: { enter: [6, 37, 2, 3] }, actions: [{ do: 'voice', id: 'v2_hall' }] },
    { id: 't_ironclad', when: { enter: [3, 30, 24, 6] }, actions: [{ do: 'voice', id: 'v2_ironclad' }, { do: 'objective', key: 'obj2.yellow' }], delay: 2.5 },
    { id: 't_hallCheckpoint', when: { enter: [28, 31, 2, 2] }, actions: [{ do: 'checkpoint', id: 'cp_east' }] },
    { id: 't_key', when: { pickup: 'i_keyYellow' }, actions: [{ do: 'wave', id: 'vatAmbush' }, { do: 'objective', key: 'obj2.yellowDoor' }, { do: 'voice', id: 'v2_key' }] },
    { id: 't_ante', when: { enter: [13, 17, 4, 4] }, actions: [{ do: 'checkpoint', id: 'cp_ante' }, { do: 'voice', id: 'v2_ante' }] },
    { id: 't_boss', when: { enter: [3, 2, 26, 12] }, actions: [{ do: 'closeDoor', id: 'd_arena', lock: true }, { do: 'wave', id: 'boss' }, { do: 'objective', key: 'obj2.boss' }, { do: 'voice', id: 'v2_boss' }] },
    { id: 't_bossDead', when: { waveCleared: 'boss' }, actions: [{ do: 'unlockDoor', id: 'd_exit' }, { do: 'openDoor', id: 'd_exit' }, { do: 'unlockDoor', id: 'd_arena' }, { do: 'message', key: 'msg.exitOpen' }, { do: 'objective', key: 'obj2.exit' }, { do: 'voice', id: 'v2_bossDead' }], delay: 1.5 },
    { id: 't_exit', when: { enter: [31, 8, 2, 2] }, actions: [{ do: 'exit' }] },
  ],
  checkpoints: [
    { id: 'cp_start', x: 7, y: 51.5, angle: 180 },
    { id: 'cp_east', x: 29.5, y: 32, angle: 90 },
    { id: 'cp_ante', x: 15, y: 19.5, angle: 180 },
  ],
  secrets: [{ id: 's_vat', rect: [48, 31, 1, 2] }],
  menuPath: [
    [7, 33, 2.5], [14, 31, 3.5], [22, 33, 3], [24, 24, 4], [14, 23.5, 4.5], [5, 25, 3.5],
  ],
};
