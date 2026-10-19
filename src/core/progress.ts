// Long-term player progress: lifetime stats, achievements and the cosmetics they unlock
// (screen palettes and weapon finishes). Stored locally, never sent anywhere.

export type StatId =
  | 'kills' | 'executions' | 'parries' | 'airKills' | 'wallJumps' | 'slamKills' | 'secrets'
  | 'bossKills' | 'chainswordKills' | 'dailyRounds';

export type PaletteId = 'default' | 'crimson' | 'toxic' | 'noir' | 'ember' | 'ice' | 'dmg';
export type SkinId = 'standard' | 'gold' | 'bone' | 'void';

export interface AchievementDef {
  id: string;
  /** Unlocked automatically when this lifetime stat reaches `goal`. */
  stat?: StatId;
  goal?: number;
  palette?: PaletteId;
  skin?: SkinId;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstBlood', stat: 'kills', goal: 100 },
  { id: 'slaughter', stat: 'kills', goal: 1000, palette: 'crimson' },
  { id: 'executioner', stat: 'executions', goal: 25, palette: 'toxic' },
  { id: 'parryMaster', stat: 'parries', goal: 20, palette: 'ice' },
  { id: 'airAce', stat: 'airKills', goal: 30 },
  { id: 'wallRunner', stat: 'wallJumps', goal: 50 },
  { id: 'meteor', stat: 'slamKills', goal: 15, palette: 'ember' },
  { id: 'bladeDancer', stat: 'chainswordKills', goal: 150 },
  { id: 'treasure3', stat: 'secrets', goal: 3, skin: 'gold' },
  { id: 'treasure6', stat: 'secrets', goal: 6, skin: 'bone' },
  { id: 'treasure10', stat: 'secrets', goal: 10, skin: 'void' },
  { id: 'bossHunter', stat: 'bossKills', goal: 5 },
  { id: 'untouchable' , palette: 'noir' },
  { id: 'bladeOnly' },
  { id: 'allSecrets', palette: 'dmg' },
  { id: 'underPar' },
  { id: 'siege10' },
  { id: 'siege20' },
  { id: 'sorcererSlain' },
  { id: 'daily5', stat: 'dailyRounds', goal: 5 },
  { id: 'ultra' },
  { id: 'campaign' },
];

const KEY = 'hellfront.progress.v1';

interface Stored {
  stats: Partial<Record<StatId, number>>;
  unlocked: string[];
  palette: PaletteId;
  skin: SkinId;
  daily: Record<string, number>;
}

class Progress {
  private s: Stored = { stats: {}, unlocked: [], palette: 'default', skin: 'standard', daily: {} };
  /** Called once per newly unlocked achievement (toast). */
  onUnlock: ((id: string) => void) | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.s = { ...this.s, ...(JSON.parse(raw) as Partial<Stored>) };
    } catch {
      /* storage unavailable */
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((f) => f());
  }

  onChange(f: () => void): void {
    this.listeners.add(f);
  }

  stat(id: StatId): number {
    return this.s.stats[id] ?? 0;
  }

  bump(id: StatId, n = 1): void {
    this.s.stats[id] = this.stat(id) + n;
    for (const a of ACHIEVEMENTS) if (a.stat === id && a.goal && this.stat(id) >= a.goal) this.unlock(a.id, false);
    this.save();
  }

  has(id: string): boolean {
    return this.s.unlocked.includes(id);
  }

  unlock(id: string, persist = true): void {
    if (this.has(id) || !ACHIEVEMENTS.some((a) => a.id === id)) return;
    this.s.unlocked.push(id);
    if (persist) this.save();
    this.onUnlock?.(id);
  }

  get unlockedCount(): number {
    return this.s.unlocked.length;
  }

  palettes(): PaletteId[] {
    return ['default', ...ACHIEVEMENTS.filter((a) => a.palette && this.has(a.id)).map((a) => a.palette!)];
  }

  skins(): SkinId[] {
    return ['standard', ...ACHIEVEMENTS.filter((a) => a.skin && this.has(a.id)).map((a) => a.skin!)];
  }

  get palette(): PaletteId {
    return this.palettes().includes(this.s.palette) ? this.s.palette : 'default';
  }

  set palette(p: PaletteId) {
    this.s.palette = p;
    this.save();
  }

  get skin(): SkinId {
    return this.skins().includes(this.s.skin) ? this.s.skin : 'standard';
  }

  set skin(k: SkinId) {
    this.s.skin = k;
    this.save();
  }

  /** Best Daily Siege round for a given date key (YYYY-MM-DD). */
  dailyBest(day: string): number {
    return this.s.daily[day] ?? 0;
  }

  setDailyBest(day: string, round: number): void {
    if (round <= this.dailyBest(day)) return;
    this.s.daily[day] = round;
    this.save();
  }
}

export const progress = new Progress();

/** CSS filter per palette (applied to the 3D view). */
export const PALETTE_FILTER: Record<PaletteId, string> = {
  default: '',
  crimson: 'sepia(0.6) saturate(2.2) hue-rotate(-35deg) contrast(1.1)',
  toxic: 'sepia(0.7) saturate(2.4) hue-rotate(55deg) brightness(1.05)',
  noir: 'grayscale(1) contrast(1.35) brightness(1.05)',
  ember: 'sepia(0.8) saturate(2.6) hue-rotate(-10deg) contrast(1.15)',
  ice: 'sepia(0.5) saturate(1.8) hue-rotate(170deg) brightness(1.08)',
  dmg: 'grayscale(1) sepia(1) saturate(1.6) hue-rotate(40deg) contrast(1.6) brightness(0.95)',
};

/** CSS filter per weapon finish (applied to the view model only). */
export const SKIN_FILTER: Record<SkinId, string> = {
  standard: '',
  gold: 'sepia(1) saturate(3) hue-rotate(5deg) brightness(1.15)',
  bone: 'grayscale(0.7) sepia(0.5) brightness(1.35) contrast(0.9)',
  void: 'invert(0.85) hue-rotate(200deg) saturate(1.8) contrast(1.2)',
};

/** Today's date key (local time). */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
