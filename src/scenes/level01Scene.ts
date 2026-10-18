import type { Engine } from '@babylonjs/core';
import type { Difficulty } from '../core/config';
import type { SaveData } from '../core/save';
import type { Settings } from '../core/settingsStore';
import type { AudioManager } from '../audio/audioManager';
import type { UIManager } from '../ui/uiManager';
import { LEVEL01 } from '../level/level01.data';
import { LevelScene, type LevelHooks } from './levelScene';

/** Chapter 1 — "Hangar". All content lives in level01.data.ts; this binds it to the generic runtime. */
export function createLevel01(
  engine: Engine, difficulty: Difficulty, audio: AudioManager, ui: UIManager, settings: () => Settings,
  hooks: LevelHooks, save: SaveData | null, progress: (p: number, label: string) => Promise<void>,
): Promise<LevelScene> {
  return LevelScene.create(engine, LEVEL01, difficulty, audio, ui, settings, hooks, save, progress);
}
