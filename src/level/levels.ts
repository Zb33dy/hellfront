import type { LevelData } from './types';
import { LEVEL01 } from './level01.data';
import { LEVEL02 } from './level02.data';

/** Campaign order. Each level's `next` points at the following id. */
export const LEVEL_ORDER: LevelData[] = [LEVEL01, LEVEL02];

export function getLevel(id: string | null | undefined): LevelData | null {
  return LEVEL_ORDER.find((l) => l.id === id) ?? null;
}
