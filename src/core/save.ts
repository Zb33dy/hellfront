import type { Difficulty } from './config';
import type { PlayerState } from '../entities/player';

export interface WorldSnapshot {
  enemies: ('dormant' | 'alive' | 'dead')[];
  pickupsTaken: number[];
  barrelsExploded: number[];
  triggers: string[];
  waves: string[];
  doorsOpen: string[];
  doorsUnlocked: string[];
  lifts: number[];
  secrets: string[];
  kills: number;
  items: number;
  time: number;
  objective: string;
}

export interface SaveData {
  version: 1;
  level: string;
  difficulty: Difficulty;
  checkpoint: string;
  player: PlayerState;
  world: WorldSnapshot;
  savedAt: number;
}

const KEY = 'hellfront.save.v1';

export const SaveStore = {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as SaveData;
      return d.version === 1 ? d : null;
    } catch {
      return null;
    }
  },
  save(d: SaveData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* storage full / disabled */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  has(): boolean {
    return this.load() !== null;
  },
};
