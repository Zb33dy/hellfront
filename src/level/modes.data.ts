import type { EnemyKind } from '../core/config';
import { SIEGE } from './siege.data';
import type { LevelData, LightDef, PickupKind, RGB, ThingDef, TriggerDef, ZoneDef } from './types';

const L = (x: number, y: number, h: number, color: RGB, intensity: number, range: number, extra: Partial<LightDef> = {}): LightDef => ({
  x, y, h, color, intensity, range, ...extra,
});
const WARM: RGB = [1, 0.8, 0.6];
const GOLD: RGB = [1, 0.75, 0.35];

// ------------------------------------------------------------------ GALLERY

const EXHIBITS: EnemyKind[] = [
  'zombieman', 'imp', 'pinky', 'ironclad', 'wraith', 'executioner', 'boltgunner',
  'hellflamer', 'terminator', 'warhound', 'warden', 'core', 'sovereign', 'sorcerer',
];
const WEAPON_PICKUPS: PickupKind[] = ['shotgun', 'chainsword', 'sniper', 'launcher', 'bolter', 'flamer', 'grenades'];

function galleryThings(): ThingDef[] {
  const out: ThingDef[] = [{ kind: 'player', x: 4.5, y: 12, angle: 90 }];
  EXHIBITS.forEach((k, i) => {
    const north = i % 2 === 0;
    out.push({ kind: k, x: 8 + Math.floor(i / 2) * 9, y: north ? 5.5 : 18.5, angle: north ? 0 : 180, frozen: true });
  });
  WEAPON_PICKUPS.forEach((k, i) => out.push({ kind: k, x: 8 + i * 9, y: 12 }));
  return out;
}

const galleryLights: LightDef[] = [];
for (let i = 0; i < 7; i++) {
  galleryLights.push(L(8 + i * 9, 5.5, 9, WARM, 1.4, 12, { shaft: true }));
  galleryLights.push(L(8 + i * 9, 18.5, 9, WARM, 1.4, 12, { shaft: true }));
  galleryLights.push(L(8 + i * 9, 12, 2.2, GOLD, 0.9, 6));
}

export const GALLERY: LevelData = {
  id: 'gallery',
  chapter: 0,
  titleKey: 'mode.gallery',
  introKey: 'gallery.intro',
  outroKey: 'gallery.intro',
  next: null,
  startLoadout: { weapons: ['pistol'], bullets: 200, shells: 0, health: 100, armor: 100 },
  completeVoice: '',
  ambience: { alarm: false },
  width: 72,
  height: 24,
  defaultWall: 'metalPanel',
  parTime: 0,
  zones: [
    { id: 'hall', rect: [2, 2, 66, 20], floor: 0, ceil: 10, floorTex: 'hangarFloor', ceilTex: 'ceilGrid', wallTex: 'metalPanel', stepTex: 'hazard', ambient: [0.16, 0.15, 0.15] },
    { id: 'walk', rect: [2, 10, 66, 4], floor: 0.2, ceil: 10, floorTex: 'floorGrate', ceilTex: 'ceilGrid', wallTex: 'metalPanel', stepTex: 'hazard', ambient: [0.16, 0.15, 0.15] },
  ],
  solids: [],
  wallPaint: [{ rect: [1, 2, 1, 20], tex: 'computer' }],
  doors: [],
  lifts: [],
  boxes: EXHIBITS.map((_, i) => {
    const north = i % 2 === 0;
    const x = 8 + Math.floor(i / 2) * 9;
    return { rect: [x - 2.5, north ? 3 : 16.5, 5, 4.5] as [number, number, number, number], y1: 0.25, tex: 'hazard' as const, topTex: 'metalPanel' as const };
  }),
  lights: galleryLights,
  things: galleryThings(),
  triggers: [{ id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'gallery.obj' }], delay: 0.3 }],
  checkpoints: [{ id: 'cp_start', x: 4.5, y: 12, angle: 90 }],
  secrets: [],
  menuPath: [[10, 12, 3], [40, 12, 3]],
};

// ------------------------------------------------------------------ BATTLE TEST (Siege arena, empty)

export const BATTLE: LevelData = {
  ...SIEGE,
  id: 'battle',
  titleKey: 'mode.battle',
  introKey: 'battle.intro',
  outroKey: 'battle.intro',
  music: 'siege',
  startLoadout: { weapons: ['pistol', 'shotgun', 'chainsword', 'sniper', 'launcher', 'bolter', 'flamer'], bullets: 200, shells: 50, rounds: 30, rockets: 20, grenades: 8, health: 100, armor: 100 },
  things: [{ kind: 'player', x: 23, y: 23, angle: 180 }],
  triggers: [{ id: 't_start', when: { start: true }, actions: [{ do: 'objective', key: 'battle.obj' }], delay: 0.3 }],
};

// ------------------------------------------------------------------ TUTORIAL: one long training corridor of stations

interface Station {
  key: string; // objective i18n key
  things?: ThingDef[];
  boxes?: LevelData['boxes'];
  zones?: ZoneDef[];
  extra?: TriggerDef['actions'];
}

const W = 10; // cells per station
const x0 = (i: number) => 4 + i * W;
const Y0 = 4, YH = 8;

const STATIONS: Station[] = [
  { key: 'tut.move' },
  { key: 'tut.door' },
  { key: 'tut.jump', boxes: [{ rect: [x0(2) + 3, Y0, 2, YH], y1: 0.55, tex: 'crate' }, { rect: [x0(2) + 5, Y0, 2, YH], y1: 1.05, tex: 'crate' }] },
  { key: 'tut.crouch', boxes: [{ rect: [x0(3) + 3, Y0, 3, YH], y0: 1.15, y1: 4, tex: 'pipeWall' }] },
  {
    key: 'tut.dash',
    zones: [{ id: 'dashLava', rect: [x0(4) + 3, Y0, 4, YH], floor: -0.5, ceil: 6, floorTex: 'lava', ceilTex: 'ceilGrid', wallTex: 'metalPanel', ambient: [0.25, 0.08, 0.03], nukage: true, lava: true }],
  },
  { key: 'tut.bhop' },
  {
    key: 'tut.guns',
    things: [{ kind: 'shotgun', x: x0(6) + 1.5, y: 8 }, { kind: 'zombieman', x: x0(6) + 8, y: 6, wave: 'w_guns', teleport: true }, { kind: 'zombieman', x: x0(6) + 8, y: 10, wave: 'w_guns', teleport: true }],
    extra: [{ do: 'wave', id: 'w_guns' }],
  },
  {
    key: 'tut.execute',
    things: [{ kind: 'chainsword', x: x0(7) + 1.5, y: 8 }, { kind: 'imp', x: x0(7) + 8, y: 6, wave: 'w_exec', teleport: true }, { kind: 'imp', x: x0(7) + 8, y: 10, wave: 'w_exec', teleport: true }],
    extra: [{ do: 'wave', id: 'w_exec' }],
  },
  {
    key: 'tut.sniper',
    things: [{ kind: 'sniper', x: x0(8) + 1.5, y: 8 }, { kind: 'imp', x: x0(8) + 9, y: 8, wave: 'w_snipe', teleport: true }],
    extra: [{ do: 'wave', id: 'w_snipe' }],
  },
  {
    key: 'tut.explosives',
    things: [
      { kind: 'launcher', x: x0(9) + 1.5, y: 7 }, { kind: 'grenades', x: x0(9) + 1.5, y: 9 },
      { kind: 'zombieman', x: x0(9) + 8, y: 7, wave: 'w_boom', teleport: true }, { kind: 'zombieman', x: x0(9) + 8.5, y: 8.5, wave: 'w_boom', teleport: true }, { kind: 'zombieman', x: x0(9) + 8, y: 10, wave: 'w_boom', teleport: true },
    ],
    extra: [{ do: 'wave', id: 'w_boom' }],
  },
  {
    key: 'tut.heresy',
    things: [{ kind: 'bolter', x: x0(10) + 1.5, y: 7 }, { kind: 'flamer', x: x0(10) + 1.5, y: 9 }, { kind: 'pinky', x: x0(10) + 8, y: 8, wave: 'w_heresy', teleport: true }],
    extra: [{ do: 'wave', id: 'w_heresy' }],
  },
  { key: 'tut.parry', things: [{ kind: 'executioner', x: x0(11) + 8, y: 8, wave: 'w_parry', teleport: true }], extra: [{ do: 'wave', id: 'w_parry' }] },
  { key: 'tut.swap' },
  {
    key: 'tut.abilities',
    things: [{ kind: 'imp', x: x0(13) + 8, y: 6, wave: 'w_ab', teleport: true }, { kind: 'zombieman', x: x0(13) + 8, y: 10, wave: 'w_ab', teleport: true }, { kind: 'pinky', x: x0(13) + 9, y: 8, wave: 'w_ab', teleport: true }],
    extra: [{ do: 'chooseAbility' }, { do: 'wave', id: 'w_ab' }],
  },
  { key: 'tut.done' },
];

function tutorial(): LevelData {
  const n = STATIONS.length;
  const width = x0(n) + 6;
  const things: ThingDef[] = [{ kind: 'player', x: 6, y: 8, angle: 90 }];
  const boxes: LevelData['boxes'] = [];
  const zones: ZoneDef[] = [
    { id: 'hall', rect: [3, Y0, width - 6, YH], floor: 0, ceil: 6, floorTex: 'concrete', ceilTex: 'ceilGrid', wallTex: 'metalPanel', stepTex: 'hazard', ambient: [0.16, 0.15, 0.15] },
  ];
  const triggers: TriggerDef[] = [];
  const lights: LightDef[] = [];
  STATIONS.forEach((st, i) => {
    const sx = x0(i);
    things.push(...(st.things ?? []));
    boxes.push(...(st.boxes ?? []));
    zones.push(...(st.zones ?? []));
    triggers.push({ id: 't_st' + i, when: i === 0 ? { start: true } : { enter: [sx, Y0, 2, YH] }, actions: [{ do: 'objective', key: st.key }, ...(st.extra ?? [])], delay: i === 0 ? 0.4 : 0 });
    lights.push(L(sx + 5, 8, 5.6, i % 2 ? WARM : [0.75, 0.85, 1], 1.4, 12, { fixture: true }));
    lights.push(L(sx + 0.5, 8, 3, GOLD, 0.8, 5));
  });
  // exit pad at the end of the last station
  const ex = x0(n - 1) + 6;
  zones.push({ id: 'pad', rect: [ex, 7, 2, 2], floor: 0.15, ceil: 6, floorTex: 'exitPad', ceilTex: 'lightPanel', wallTex: 'metalPanel', stepTex: 'hazard', ambient: [0.2, 0.4, 0.3] });
  lights.push(L(ex + 1, 8, 2, [0.4, 1, 0.65], 1.8, 8, { mode: 'pulse' }));
  triggers.push({ id: 't_exit', when: { enter: [ex, 7, 2, 2] }, actions: [{ do: 'exit' }] });
  return {
    id: 'tutorial',
    chapter: 0,
    titleKey: 'mode.tutorial',
    introKey: 'tut.intro',
    outroKey: 'tut.outro',
    next: null,
    startLoadout: { weapons: ['pistol'], bullets: 200, shells: 0, health: 100, armor: 50 },
    completeVoice: '',
    ambience: { alarm: false },
    width,
    height: 16,
    defaultWall: 'metalPanel',
    parTime: 600,
    zones,
    solids: [],
    wallPaint: [],
    doors: [{ id: 'd_tut', rect: [x0(1) + 4, Y0, 1, YH], type: 'normal', ceil: 6 }],
    lifts: [],
    boxes,
    lights,
    things,
    triggers,
    checkpoints: [{ id: 'cp_start', x: 6, y: 8, angle: 90 }],
    secrets: [],
    menuPath: [[6, 8, 2], [30, 8, 2]],
  };
}

export const TUTORIAL: LevelData = tutorial();
