import { mulberry32 } from '../core/util';
import type { ProcRecipe } from './audioManifest';

// Procedural fallbacks: every sound in the manifest has a small synth recipe so the game
// stays fully playable (and readable by ear) even when a generated file is missing.

type Wave = 'noise' | 'sine' | 'saw' | 'square' | 'tri';

interface Layer {
  w: Wave;
  f0?: number;
  f1?: number;
  start?: number;
  dur: number;
  a?: number;
  decay?: number;
  g: number;
  lp0?: number;
  lp1?: number;
  hp?: number;
  am?: number;
  amDepth?: number;
}

interface Recipe {
  dur: number;
  layers: Layer[];
  drive?: number;
  echo?: [number, number];
  loop?: boolean;
  special?: 'bubbles' | 'industrial' | 'alarm';
}

const R: Record<ProcRecipe, Recipe> = {
  pistol: { dur: 0.55, drive: 2, echo: [0.07, 0.25], layers: [
    { w: 'noise', dur: 0.3, decay: 26, g: 1, lp0: 7000, lp1: 900 },
    { w: 'sine', f0: 170, f1: 50, dur: 0.16, decay: 22, g: 0.9 },
    { w: 'noise', dur: 0.5, decay: 7, g: 0.18, lp0: 1600, lp1: 600 }] },
  shotgun: { dur: 1.0, drive: 2.6, echo: [0.09, 0.3], layers: [
    { w: 'noise', dur: 0.7, decay: 12, g: 1.2, lp0: 5000, lp1: 380 },
    { w: 'sine', f0: 95, f1: 32, dur: 0.45, decay: 8, g: 1.3 },
    { w: 'noise', dur: 1.0, decay: 4, g: 0.2, lp0: 900, lp1: 300 }] },
  rifle: { dur: 0.6, drive: 2, echo: [0.11, 0.3], layers: [
    { w: 'noise', dur: 0.3, decay: 28, g: 0.9, lp0: 5000, lp1: 700 },
    { w: 'sine', f0: 140, f1: 55, dur: 0.14, decay: 25, g: 0.7 }] },
  pump: { dur: 0.45, layers: [
    { w: 'noise', dur: 0.06, decay: 60, g: 0.7, hp: 1500 },
    { w: 'square', f0: 900, dur: 0.02, decay: 90, g: 0.2 },
    { w: 'noise', start: 0.2, dur: 0.07, decay: 55, g: 0.8, hp: 1200 },
    { w: 'square', start: 0.2, f0: 700, dur: 0.03, decay: 80, g: 0.2 }] },
  sawIdle: { dur: 2, loop: true, layers: [
    { w: 'saw', f0: 55, dur: 2, g: 0.5, am: 18, amDepth: 0.5, lp0: 2200, lp1: 2200 },
    { w: 'square', f0: 110, dur: 2, g: 0.14, am: 36, amDepth: 0.6 },
    { w: 'noise', dur: 2, g: 0.12, hp: 2000, am: 30, amDepth: 0.8 }] },
  swing: { dur: 0.6, drive: 1.5, layers: [
    { w: 'saw', f0: 70, f1: 170, dur: 0.55, a: 0.05, decay: 4, g: 0.6, am: 26, amDepth: 0.5, lp0: 3000, lp1: 3000 },
    { w: 'noise', dur: 0.5, a: 0.1, decay: 4, g: 0.4, lp0: 700, lp1: 3500 }] },
  squish: { dur: 0.7, drive: 2, layers: [
    { w: 'noise', dur: 0.6, decay: 7, g: 0.8, lp0: 1100, lp1: 500 },
    { w: 'saw', f0: 60, f1: 50, dur: 0.6, decay: 5, g: 0.5, am: 32, amDepth: 0.8 },
    { w: 'noise', dur: 0.3, decay: 14, g: 0.3, hp: 3000, am: 55, amDepth: 1 }] },
  click: { dur: 0.08, layers: [{ w: 'noise', dur: 0.04, decay: 120, g: 0.8, hp: 3000 }, { w: 'square', f0: 1800, dur: 0.01, decay: 200, g: 0.2 }] },
  switch: { dur: 0.35, layers: [
    { w: 'noise', dur: 0.08, decay: 40, g: 0.4, lp0: 2000, lp1: 2000 },
    { w: 'noise', start: 0.15, dur: 0.06, decay: 60, g: 0.6, hp: 1200 },
    { w: 'sine', start: 0.15, f0: 420, dur: 0.12, decay: 40, g: 0.25 }] },
  blip: { dur: 0.45, layers: [
    { w: 'sine', f0: 600, f1: 1200, dur: 0.25, decay: 9, g: 0.5 },
    { w: 'sine', start: 0.08, f0: 1200, f1: 2000, dur: 0.3, decay: 9, g: 0.3 },
    { w: 'noise', dur: 0.2, decay: 18, g: 0.12, hp: 4000 }] },
  chime: { dur: 0.8, layers: [{ w: 'sine', f0: 880, dur: 0.8, decay: 5, g: 0.4 }, { w: 'sine', f0: 1320, dur: 0.8, decay: 6, g: 0.25 }] },
  armor: { dur: 1.0, drive: 1.3, layers: [
    { w: 'noise', dur: 0.15, decay: 30, g: 0.6, hp: 900 },
    { w: 'square', start: 0.08, f0: 220, dur: 0.9, decay: 3.5, g: 0.2, lp0: 2500, lp1: 900 },
    { w: 'square', start: 0.08, f0: 330, dur: 0.9, decay: 3.5, g: 0.16, lp0: 2500, lp1: 900 },
    { w: 'square', start: 0.08, f0: 440, dur: 0.9, decay: 3.5, g: 0.12, lp0: 2500, lp1: 900 }] },
  keycard: { dur: 0.9, echo: [0.12, 0.3], layers: [
    { w: 'sine', f0: 1000, dur: 0.1, decay: 10, g: 0.45 },
    { w: 'sine', start: 0.13, f0: 1400, dur: 0.2, decay: 8, g: 0.45 },
    { w: 'tri', start: 0.13, f0: 2800, dur: 0.6, decay: 5, g: 0.12 }] },
  weaponGet: { dur: 1.2, drive: 1.4, echo: [0.1, 0.3], layers: [
    { w: 'noise', dur: 0.06, decay: 60, g: 0.7, hp: 1500 },
    { w: 'noise', start: 0.2, dur: 0.07, decay: 55, g: 0.8, hp: 1200 },
    { w: 'saw', start: 0.3, f0: 165, dur: 0.9, decay: 3, g: 0.25, lp0: 2000, lp1: 700 },
    { w: 'saw', start: 0.3, f0: 247, dur: 0.9, decay: 3, g: 0.2, lp0: 2000, lp1: 700 }] },
  doorOpen: { dur: 1.1, layers: [
    { w: 'noise', dur: 1.0, a: 0.12, decay: 1.6, g: 0.5, lp0: 350, lp1: 1600 },
    { w: 'saw', f0: 55, f1: 85, dur: 0.95, a: 0.1, decay: 2, g: 0.28, am: 11, amDepth: 0.5, lp0: 600, lp1: 600 },
    { w: 'noise', dur: 0.12, decay: 25, g: 0.6, hp: 2500 },
    { w: 'sine', start: 0.9, f0: 70, f1: 45, dur: 0.2, decay: 18, g: 0.7 }] },
  doorClose: { dur: 1.1, drive: 1.6, layers: [
    { w: 'saw', f0: 85, f1: 55, dur: 0.85, a: 0.05, decay: 1.5, g: 0.28, am: 11, amDepth: 0.5, lp0: 600, lp1: 600 },
    { w: 'noise', dur: 0.8, decay: 2, g: 0.35, lp0: 1200, lp1: 400 },
    { w: 'noise', start: 0.8, dur: 0.3, decay: 14, g: 0.9, lp0: 1400, lp1: 300 },
    { w: 'sine', start: 0.8, f0: 60, f1: 40, dur: 0.3, decay: 10, g: 0.9 }] },
  denied: { dur: 0.55, drive: 1.5, layers: [
    { w: 'square', f0: 140, dur: 0.18, g: 0.35, lp0: 1500, lp1: 1500 },
    { w: 'square', start: 0.25, f0: 140, dur: 0.25, g: 0.35, lp0: 1500, lp1: 1500 }] },
  hum: { dur: 2, loop: true, layers: [
    { w: 'saw', f0: 50, dur: 2, g: 0.3, lp0: 400, lp1: 400 },
    { w: 'sine', f0: 100, dur: 2, g: 0.25, am: 7, amDepth: 0.4 },
    { w: 'noise', dur: 2, g: 0.15, lp0: 300, lp1: 300, am: 13, amDepth: 0.6 }] },
  thunk: { dur: 0.45, layers: [
    { w: 'sine', f0: 85, f1: 40, dur: 0.35, decay: 13, g: 0.9 },
    { w: 'noise', dur: 0.2, decay: 30, g: 0.5, lp0: 1800, lp1: 600 }] },
  explosion: { dur: 2.2, drive: 2.4, echo: [0.13, 0.35], layers: [
    { w: 'noise', dur: 2.0, decay: 2.4, g: 1.3, lp0: 3500, lp1: 160 },
    { w: 'sine', f0: 65, f1: 24, dur: 1.4, decay: 3, g: 1.3 },
    { w: 'noise', dur: 1.2, decay: 5, g: 0.25, hp: 2500, am: 23, amDepth: 1 }] },
  cast: { dur: 0.7, layers: [
    { w: 'noise', dur: 0.6, a: 0.06, decay: 4, g: 0.6, lp0: 500, lp1: 4000 },
    { w: 'saw', f0: 120, f1: 380, dur: 0.4, a: 0.05, decay: 6, g: 0.2, lp0: 2000, lp1: 2000 }] },
  fireLoop: { dur: 1.5, loop: true, layers: [
    { w: 'noise', dur: 1.5, g: 0.5, lp0: 1100, lp1: 1100, am: 9, amDepth: 0.4 },
    { w: 'noise', dur: 1.5, g: 0.15, hp: 4000, am: 37, amDepth: 1 }] },
  fireImpact: { dur: 0.9, drive: 1.8, layers: [
    { w: 'noise', dur: 0.8, decay: 6, g: 1, lp0: 2600, lp1: 300 },
    { w: 'sine', f0: 95, f1: 40, dur: 0.4, decay: 9, g: 0.8 },
    { w: 'noise', dur: 0.6, decay: 7, g: 0.2, hp: 3500, am: 41, amDepth: 1 }] },
  stepMetal: { dur: 0.25, layers: [
    { w: 'noise', dur: 0.12, decay: 50, g: 0.6, hp: 700 },
    { w: 'sine', f0: 320, dur: 0.2, decay: 35, g: 0.25 },
    { w: 'sine', f0: 1730, dur: 0.15, decay: 30, g: 0.07 }] },
  stepConcrete: { dur: 0.2, layers: [
    { w: 'noise', dur: 0.12, decay: 45, g: 0.7, lp0: 1500, lp1: 600 },
    { w: 'sine', f0: 110, f1: 70, dur: 0.08, decay: 50, g: 0.4 }] },
  grunt: { dur: 0.4, drive: 1.6, layers: [
    { w: 'saw', f0: 150, f1: 95, dur: 0.32, a: 0.02, decay: 6, g: 0.6, lp0: 900, lp1: 700, am: 35, amDepth: 0.3 },
    { w: 'noise', dur: 0.3, decay: 8, g: 0.2, lp0: 700, lp1: 500 }] },
  death: { dur: 1.6, drive: 1.6, layers: [
    { w: 'saw', f0: 240, f1: 70, dur: 1.4, a: 0.03, decay: 1.8, g: 0.6, lp0: 1300, lp1: 600, am: 8, amDepth: 0.3 },
    { w: 'noise', dur: 1.2, decay: 2, g: 0.2, lp0: 900, lp1: 400 }] },
  zAlert: { dur: 1.0, drive: 2, layers: [
    { w: 'saw', f0: 95, f1: 70, dur: 0.9, a: 0.05, decay: 2.5, g: 0.6, am: 22, amDepth: 0.5, lp0: 800, lp1: 600 },
    { w: 'noise', dur: 0.9, decay: 3, g: 0.25, lp0: 500, lp1: 500 }] },
  zPain: { dur: 0.4, drive: 1.6, layers: [{ w: 'saw', f0: 170, f1: 110, dur: 0.35, a: 0.01, decay: 6, g: 0.6, am: 30, amDepth: 0.4, lp0: 1100, lp1: 900 }] },
  zDeath: { dur: 1.1, drive: 1.8, layers: [
    { w: 'saw', f0: 130, f1: 48, dur: 1.0, a: 0.02, decay: 2.6, g: 0.6, am: 16, amDepth: 0.5, lp0: 900, lp1: 500 },
    { w: 'noise', start: 0.6, dur: 0.4, decay: 9, g: 0.4, lp0: 600, lp1: 300 }] },
  growl: { dur: 1.0, drive: 2, layers: [
    { w: 'saw', f0: 78, f1: 70, dur: 1, a: 0.1, decay: 2, g: 0.5, am: 14, amDepth: 0.6, lp0: 500, lp1: 500 },
    { w: 'noise', dur: 1, a: 0.1, decay: 2, g: 0.3, lp0: 650, lp1: 650, am: 9, amDepth: 0.6 }] },
  impAlert: { dur: 0.9, drive: 2, layers: [
    { w: 'saw', f0: 310, f1: 640, dur: 0.75, a: 0.03, decay: 3, g: 0.5, am: 40, amDepth: 0.5, lp0: 2600, lp1: 2000 },
    { w: 'noise', dur: 0.7, decay: 4, g: 0.25, hp: 1500 }] },
  impPain: { dur: 0.35, drive: 1.8, layers: [{ w: 'saw', f0: 420, f1: 250, dur: 0.3, decay: 8, g: 0.55, am: 45, amDepth: 0.5, lp0: 2200, lp1: 1500 }] },
  impDeath: { dur: 1.3, drive: 2, layers: [
    { w: 'saw', f0: 520, f1: 110, dur: 1.2, a: 0.02, decay: 2, g: 0.55, am: 20, amDepth: 0.6, lp0: 2200, lp1: 700 },
    { w: 'noise', start: 0.7, dur: 0.5, decay: 7, g: 0.35, lp0: 700, lp1: 300 }] },
  claw: { dur: 0.35, layers: [
    { w: 'noise', dur: 0.25, decay: 10, g: 0.7, lp0: 1800, lp1: 6000 },
    { w: 'noise', start: 0.06, dur: 0.15, decay: 30, g: 0.5, hp: 3000 }] },
  snarl: { dur: 1.0, drive: 2.5, layers: [
    { w: 'saw', f0: 58, f1: 72, dur: 1, a: 0.05, decay: 2, g: 0.6, am: 18, amDepth: 0.7, lp0: 650, lp1: 550 },
    { w: 'noise', dur: 1, decay: 2.5, g: 0.3, lp0: 450, lp1: 450, am: 25, amDepth: 0.8 }] },
  charge: { dur: 1.3, drive: 2.5, layers: [
    { w: 'saw', f0: 80, f1: 150, dur: 1.1, a: 0.05, decay: 1.6, g: 0.6, am: 12, amDepth: 0.5, lp0: 1000, lp1: 900 },
    { w: 'sine', start: 0.2, f0: 60, f1: 40, dur: 0.15, decay: 25, g: 0.8 },
    { w: 'sine', start: 0.5, f0: 60, f1: 40, dur: 0.15, decay: 25, g: 0.8 },
    { w: 'sine', start: 0.8, f0: 60, f1: 40, dur: 0.15, decay: 25, g: 0.8 }] },
  pinkyPain: { dur: 0.45, drive: 2, layers: [{ w: 'saw', f0: 210, f1: 120, dur: 0.4, decay: 6, g: 0.6, am: 30, amDepth: 0.5, lp0: 1300, lp1: 900 }] },
  pinkyDeath: { dur: 1.7, drive: 2.2, layers: [
    { w: 'saw', f0: 160, f1: 40, dur: 1.4, a: 0.02, decay: 1.8, g: 0.6, am: 10, amDepth: 0.5, lp0: 1000, lp1: 400 },
    { w: 'sine', start: 1.2, f0: 70, f1: 35, dur: 0.4, decay: 9, g: 1 },
    { w: 'noise', start: 1.2, dur: 0.4, decay: 10, g: 0.5, lp0: 900, lp1: 300 }] },
  bite: { dur: 0.3, drive: 1.6, layers: [
    { w: 'noise', dur: 0.2, decay: 25, g: 0.7, lp0: 1600, lp1: 700 },
    { w: 'sine', f0: 130, f1: 70, dur: 0.15, decay: 30, g: 0.6 },
    { w: 'noise', start: 0.05, dur: 0.12, decay: 35, g: 0.4, hp: 2500 }] },
  bubbles: { dur: 4, loop: true, special: 'bubbles', layers: [{ w: 'noise', dur: 4, g: 0.08, lp0: 250, lp1: 250 }] },
  drone: { dur: 6, loop: true, layers: [
    { w: 'saw', f0: 45, dur: 6, g: 0.22, lp0: 240, lp1: 240, am: 0.33, amDepth: 0.3 },
    { w: 'saw', f0: 45.5, dur: 6, g: 0.22, lp0: 240, lp1: 240 },
    { w: 'noise', dur: 6, g: 0.15, lp0: 160, lp1: 160, am: 0.5, amDepth: 0.4 }] },
  industrial: { dur: 5, loop: true, special: 'industrial', layers: [{ w: 'noise', dur: 5, g: 0.08, lp0: 200, lp1: 200 }] },
  alarm: { dur: 4, loop: true, special: 'alarm', layers: [] },
  hover: { dur: 0.1, layers: [{ w: 'sine', f0: 900, dur: 0.05, decay: 60, g: 0.3 }, { w: 'noise', dur: 0.04, decay: 80, g: 0.2, hp: 3000 }] },
  uiClick: { dur: 0.25, drive: 1.5, layers: [
    { w: 'noise', dur: 0.08, decay: 40, g: 0.7, hp: 800 },
    { w: 'sine', f0: 220, f1: 80, dur: 0.15, decay: 25, g: 0.6 }] },
  uiBack: { dur: 0.25, layers: [{ w: 'sine', f0: 300, f1: 110, dur: 0.2, decay: 16, g: 0.6 }, { w: 'noise', dur: 0.05, decay: 60, g: 0.3, hp: 1200 }] },
  sting: { dur: 3.2, drive: 3.5, echo: [0.18, 0.35], layers: [
    { w: 'saw', f0: 82, dur: 3, a: 0.01, decay: 1.2, g: 0.35, lp0: 1800, lp1: 500 },
    { w: 'saw', f0: 123, dur: 3, a: 0.01, decay: 1.2, g: 0.3, lp0: 1800, lp1: 500 },
    { w: 'saw', f0: 164, dur: 3, a: 0.01, decay: 1.2, g: 0.25, lp0: 1800, lp1: 500 },
    { w: 'noise', dur: 0.5, decay: 8, g: 0.8, lp0: 2000, lp1: 200 },
    { w: 'sine', f0: 70, f1: 40, dur: 0.6, decay: 6, g: 1 }] },
  teleport: { dur: 1.0, drive: 1.4, echo: [0.08, 0.4], layers: [
    { w: 'saw', f0: 1800, f1: 160, dur: 0.6, decay: 4, g: 0.25, lp0: 5000, lp1: 1500 },
    { w: 'noise', dur: 0.8, a: 0.05, decay: 4, g: 0.4, hp: 1800, am: 50, amDepth: 1 },
    { w: 'sine', f0: 90, f1: 520, dur: 0.5, a: 0.3, decay: 3, g: 0.3 }] },
  ricochet: { dur: 0.35, layers: [
    { w: 'sine', f0: 2600, f1: 1700, dur: 0.25, decay: 14, g: 0.22 },
    { w: 'noise', dur: 0.05, decay: 60, g: 0.5, hp: 2000 }] },
  gib: { dur: 0.9, drive: 1.8, layers: [
    { w: 'noise', dur: 0.8, decay: 5, g: 0.9, lp0: 1300, lp1: 400 },
    { w: 'sine', f0: 90, f1: 45, dur: 0.3, decay: 14, g: 0.8 },
    { w: 'noise', start: 0.15, dur: 0.15, decay: 25, g: 0.6, lp0: 1000, lp1: 500 },
    { w: 'noise', start: 0.35, dur: 0.15, decay: 25, g: 0.4, lp0: 900, lp1: 400 }] },
  fleshHit: { dur: 0.2, layers: [{ w: 'noise', dur: 0.15, decay: 35, g: 0.7, lp0: 1000, lp1: 500 }, { w: 'sine', f0: 95, dur: 0.1, decay: 30, g: 0.5 }] },
  radio: { dur: 0.2, layers: [{ w: 'noise', dur: 0.12, decay: 12, g: 0.4, hp: 1000, lp0: 4000, lp1: 4000 }, { w: 'square', f0: 1400, dur: 0.04, decay: 50, g: 0.15 }] },
  secret: { dur: 1.6, echo: [0.16, 0.45], layers: [
    { w: 'sine', f0: 440, dur: 0.5, decay: 5, g: 0.35 },
    { w: 'sine', start: 0.12, f0: 554, dur: 0.5, decay: 5, g: 0.35 },
    { w: 'sine', start: 0.24, f0: 659, dur: 0.5, decay: 5, g: 0.35 },
    { w: 'sine', start: 0.36, f0: 880, dur: 0.8, decay: 4, g: 0.35 }] },
};

export function synthesize(ctx: BaseAudioContext, recipe: ProcRecipe, variant: number): AudioBuffer {
  const rc = R[recipe];
  const sr = ctx.sampleRate;
  const n = Math.ceil(rc.dur * sr);
  const out = new Float32Array(n);
  const rnd = mulberry32(variant * 9973 + recipe.length * 31 + recipe.charCodeAt(0));
  const pj = 1 + (variant === 0 ? 0 : (rnd() - 0.5) * 0.18);

  for (const L of rc.layers) {
    const s0 = Math.floor((L.start ?? 0) * sr);
    const len = Math.min(Math.floor(L.dur * sr), n - s0);
    let phase = 0;
    let lp = 0, hpPrev = 0, hpOut = 0;
    const f0 = (L.f0 ?? 0) * pj, f1 = (L.f1 ?? L.f0 ?? 0) * pj;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const k = i / Math.max(len - 1, 1);
      const f = f0 * Math.pow(f1 / Math.max(f0, 1e-3), k) || 0;
      phase += f / sr;
      let s: number;
      switch (L.w) {
        case 'noise': s = rnd() * 2 - 1; break;
        case 'sine': s = Math.sin(phase * Math.PI * 2); break;
        case 'saw': s = 2 * (phase % 1) - 1; break;
        case 'square': s = phase % 1 < 0.5 ? 1 : -1; break;
        default: s = 4 * Math.abs((phase % 1) - 0.5) - 1;
      }
      if (L.lp0) {
        const fc = L.lp0 * Math.pow((L.lp1 ?? L.lp0) / L.lp0, k);
        const a = 1 - Math.exp((-2 * Math.PI * fc) / sr);
        lp += (s - lp) * a;
        s = lp;
      }
      if (L.hp) {
        const a = Math.exp((-2 * Math.PI * L.hp) / sr);
        hpOut = a * (hpOut + s - hpPrev);
        hpPrev = s;
        s = hpOut;
      }
      let env = 1;
      const att = L.a ?? 0.002;
      if (t < att) env = t / att;
      if (L.decay) env *= Math.exp(-(t - Math.min(t, att)) * L.decay);
      const rel = Math.min(0.02, L.dur * 0.2);
      if (t > L.dur - rel && !rc.loop) env *= Math.max(0, (L.dur - t) / rel);
      if (L.am) env *= 1 - (L.amDepth ?? 0.5) * (0.5 + 0.5 * Math.sin(t * L.am * Math.PI * 2));
      out[s0 + i] += s * env * L.g;
    }
  }

  if (rc.special === 'bubbles') {
    for (let b = 0; b < 26; b++) {
      const st = Math.floor(rnd() * (n - sr * 0.1));
      const f = 180 + rnd() * 420;
      const len = Math.floor(sr * (0.03 + rnd() * 0.06));
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        ph += (f * (1 + k * 1.8)) / sr;
        out[st + i] += Math.sin(ph * Math.PI * 2) * Math.sin(k * Math.PI) * 0.35;
      }
    }
  } else if (rc.special === 'industrial') {
    for (let beat = 0; beat < 4; beat++) {
      const st = Math.floor(beat * 1.25 * sr);
      for (let i = 0; i < sr * 0.4 && st + i < n; i++) {
        const t = i / sr;
        out[st + i] += Math.sin(2 * Math.PI * 48 * t) * Math.exp(-t * 11) * 0.55;
        if (beat % 2 === 1) out[st + i] += (rnd() * 2 - 1) * Math.exp(-t * 30) * 0.12;
      }
    }
  } else if (rc.special === 'alarm') {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const tri = 1 - Math.abs(((t / 2) % 1) * 2 - 1);
      ph += (480 + 320 * tri) / sr;
      out[i] += (Math.sin(ph * Math.PI * 2) * 0.6 + Math.sin(ph * Math.PI * 4) * 0.15) * 0.35;
    }
  }

  if (rc.drive) for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * rc.drive) / Math.tanh(rc.drive);
  if (rc.echo) {
    const [d, fb] = rc.echo;
    const ds = Math.floor(d * sr);
    for (let i = ds; i < n; i++) out[i] += out[i - ds] * fb;
  }
  if (rc.loop) {
    // crossfade tail into head for a seamless loop
    const xf = Math.floor(sr * 0.08);
    for (let i = 0; i < xf; i++) {
      const k = i / xf;
      out[i] = out[i] * k + out[n - xf + i] * (1 - k);
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const norm = peak > 0 ? 0.9 / peak : 1;
  const buf = ctx.createBuffer(1, rc.loop ? n - Math.floor(sr * 0.08) : n, sr);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = out[i] * norm;
  return buf;
}

/** Garbled radio chatter used when a voice file is missing (subtitles carry the words). */
export function synthesizeChatter(ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(1, n, sr);
  const ch = buf.getChannelData(0);
  const rnd = mulberry32(seed);
  let ph = 0;
  let syl = 0, sylLen = 0, f = 120;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    if (syl <= 0) {
      sylLen = Math.floor(sr * (0.08 + rnd() * 0.16));
      syl = sylLen;
      f = 95 + rnd() * 70;
      if (rnd() < 0.18) syl = sylLen = Math.floor(sr * 0.12); // pause
    }
    const k = 1 - syl / sylLen;
    syl--;
    ph += f / sr;
    const voiced = (2 * (ph % 1) - 1) * Math.sin(k * Math.PI);
    lp += (voiced + (rnd() - 0.5) * 0.3 - lp) * 0.18;
    ch[i] = lp * 0.8;
  }
  return buf;
}
