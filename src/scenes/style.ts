/**
 * Style meter: kills feed points, variety and flair feed more, getting hit or idling drains them.
 * The rank (D → SSS) multiplies Siege score.
 */

export interface StyleRank {
  letter: string;
  key: string; // i18n key of the rank name
  min: number;
  mul: number;
}

export const RANKS: StyleRank[] = [
  { letter: 'D', key: 'style.d', min: 0, mul: 1 },
  { letter: 'C', key: 'style.c', min: 100, mul: 1.2 },
  { letter: 'B', key: 'style.b', min: 220, mul: 1.5 },
  { letter: 'A', key: 'style.a', min: 380, mul: 2 },
  { letter: 'S', key: 'style.s', min: 580, mul: 2.5 },
  { letter: 'SS', key: 'style.ss', min: 820, mul: 3 },
  { letter: 'SSS', key: 'style.sss', min: 1100, mul: 4 },
];
const CAP = 1400;

export type KillTag = 'variety' | 'air' | 'focus' | 'glory' | 'multi' | 'explosive' | 'melee' | 'longshot';

const BONUS: Record<KillTag, number> = { variety: 45, air: 40, focus: 20, glory: 110, multi: 50, explosive: 30, melee: 25, longshot: 35 };

export class StyleMeter {
  points = 0;
  private recentWeapons: string[] = [];
  private lastKillT = -10;
  private multi = 0;
  /** Bonus labels to show (consumed by the HUD). */
  readonly feed: string[] = [];
  private time = 0;

  get rankIndex(): number {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (this.points >= RANKS[k].min) i = k;
    return i;
  }

  get rank(): StyleRank {
    return RANKS[this.rankIndex];
  }

  /** 0..1 progress toward the next rank. */
  get progress(): number {
    const i = this.rankIndex;
    if (i === RANKS.length - 1) return Math.min(1, (this.points - RANKS[i].min) / (CAP - RANKS[i].min));
    return (this.points - RANKS[i].min) / (RANKS[i + 1].min - RANKS[i].min);
  }

  update(dt: number): void {
    this.time += dt;
    // decay faster at higher ranks, and only after a short grace period
    if (this.time - this.lastKillT > 2.5) this.points = Math.max(0, this.points - dt * (14 + this.rankIndex * 9));
  }

  kill(weapon: string, tags: KillTag[]): void {
    let gain = 60;
    const t = [...tags];
    if (weapon && !this.recentWeapons.includes(weapon) && this.recentWeapons.length >= 1) t.push('variety');
    this.recentWeapons.push(weapon);
    if (this.recentWeapons.length > 2) this.recentWeapons.shift();
    if (this.time - this.lastKillT < 1.6) {
      this.multi++;
      t.push('multi');
    } else this.multi = 0;
    this.lastKillT = this.time;
    for (const tag of t) {
      gain += BONUS[tag] * (tag === 'multi' ? Math.min(3, this.multi) : 1);
      this.feed.push('style.tag.' + tag);
    }
    // repeating the same weapon earns less as the rank climbs
    if (!t.includes('variety') && this.rankIndex >= 3) gain *= 0.7;
    this.points = Math.min(CAP, this.points + gain);
  }

  hurt(amount: number): void {
    this.points = Math.max(0, this.points - (40 + amount * 4));
  }

  reset(): void {
    this.points = 0;
    this.recentWeapons = [];
    this.multi = 0;
  }
}
