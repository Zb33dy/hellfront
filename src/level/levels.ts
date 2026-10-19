import type { LevelData } from './types';
import { LEVEL01 } from './level01.data';
import { LEVEL02 } from './level02.data';
import { LEVEL03 } from './level03.data';
import { LEVEL04 } from './level04.data';
import { LEVEL05 } from './level05.data';
import { SIEGE } from './siege.data';
import { BATTLE, GALLERY, TUTORIAL } from './modes.data';

/** Campaign order. Each level's `next` points at the following id. */
export const LEVEL_ORDER: LevelData[] = [LEVEL01, LEVEL02, LEVEL03, LEVEL04, LEVEL05];

export function getLevel(id: string | null | undefined): LevelData | null {
  if (id === 'siege') return SIEGE;
  if (id === 'tutorial') return TUTORIAL;
  if (id === 'gallery') return GALLERY;
  if (id === 'battle') return BATTLE;
  return LEVEL_ORDER.find((l) => l.id === id) ?? null;
}
