import { AMMO_MAX, CELL, PLAYER, type AmmoType, type EnemyKind } from '../core/config';
import { t } from '../core/i18n';
import { rand } from '../core/util';
import type { Enemy } from '../entities/enemy';
import { SIEGE_SPAWNS } from '../level/siege.data';
import type { LevelScene } from './levelScene';

const BEST_KEY = 'hellfront.siege.best';

/** Cost and first round of each regular wave monster. */
const POOL: { kind: EnemyKind; cost: number; from: number; weight: number }[] = [
  { kind: 'zombieman', cost: 1, from: 1, weight: 4 },
  { kind: 'imp', cost: 2, from: 1, weight: 4 },
  { kind: 'pinky', cost: 3, from: 2, weight: 3 },
  { kind: 'wraith', cost: 3, from: 3, weight: 3 },
  { kind: 'ironclad', cost: 4, from: 4, weight: 2 },
  { kind: 'executioner', cost: 5, from: 6, weight: 2 },
];

export type Modifier = 'swift' | 'bladeOnly' | 'darkness' | 'armored' | 'glass' | 'frenzy';
const MODIFIERS: Modifier[] = ['swift', 'bladeOnly', 'darkness', 'armored', 'glass', 'frenzy'];
/** Soul bonus for surviving a harder rule. */
const MOD_BONUS: Record<Modifier, number> = { swift: 1.3, bladeOnly: 1.6, darkness: 1.3, armored: 2, glass: 2, frenzy: 1.5 };

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  level?: number;
  maxed?: boolean;
}

/** Permanent upgrades for this run. */
interface Upgrades {
  power: number; // +15% damage each
  vitality: number; // +25 max health each
  focus: number; // +1.5 s focus each
  speed: number; // +8% move speed each
}

export function siegeBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Siege mode: endless rounds. Every round spends a growing "budget" on monsters that pour out of
 * the gates; monster health grows with the round number. Every fifth round is a Warhound hunt —
 * only Warhounds, one more each time. Kills earn souls (multiplied by the style rank), spent in
 * the shop between rounds. From round 3 a round may carry a modifier that pays extra souls.
 */
export class SiegeController {
  round = 0;
  phase: 'intermission' | 'fighting' = 'intermission';
  souls = 0;
  score = 0;
  modifier: Modifier | null = null;
  readonly up: Upgrades = { power: 0, vitality: 0, focus: 0, speed: 0 };
  private timer = 6;
  private queue: EnemyKind[] = [];
  private spawnT = 0;
  private waveSize = 0;
  private spawned = 0;
  readonly best = siegeBest();

  constructor(private L: LevelScene) {}

  get bossRound(): boolean {
    return this.round > 0 && this.round % 5 === 0;
  }

  get damageMul(): number {
    return 1 + 0.15 * this.up.power;
  }

  private get hpMul(): number {
    return this.L.diff.enemyHealth * (1 + 0.07 * (this.round - 1)) * (this.modifier === 'armored' ? 1.5 : 1);
  }

  start(): void {
    this.L.ui.hud.banner(t('siege.title'), t('siege.get'));
    this.L.hooks.voice('vs_start');
  }

  private beginRound(): void {
    this.round++;
    this.phase = 'fighting';
    this.modifier = !this.bossRound && this.round >= 3 && Math.random() < 0.45 ? MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)] : null;
    this.queue = this.compose();
    this.waveSize = this.queue.length;
    this.spawned = 0;
    this.spawnT = 0.5;
    if (this.round > siegeBest()) {
      try {
        localStorage.setItem(BEST_KEY, String(this.round));
      } catch {
        /* ignore */
      }
    }
    const L = this.L;
    if (this.modifier === 'darkness') L.lights.fogRange = [4, 26];
    if (this.bossRound) {
      L.ui.hud.banner(t('siege.round', { n: this.round }), t('siege.hounds'));
      L.hooks.voice('vs_hound');
      L.sound('pinky_charge', null, { pitch: 0.5, volume: 1.2 });
    } else {
      L.ui.hud.banner(t('siege.round', { n: this.round }), this.modifier ? t('siege.mod.' + this.modifier) : '');
      L.sound('teleport', null, { pitch: 0.6, volume: 0.9 });
    }
  }

  private compose(): EnemyKind[] {
    if (this.bossRound) return Array.from({ length: this.round / 5 }, () => 'warhound' as EnemyKind);
    let budget = 5 + this.round * 3;
    const out: EnemyKind[] = [];
    const avail = POOL.filter((p) => p.from <= this.round);
    while (budget > 0) {
      const fits = avail.filter((p) => p.cost <= budget);
      if (!fits.length) break;
      const total = fits.reduce((s, p) => s + p.weight, 0);
      let r = Math.random() * total;
      const pick = fits.find((p) => (r -= p.weight) < 0) ?? fits[0];
      out.push(pick.kind);
      budget -= pick.cost;
    }
    return out;
  }

  /** Remaining monsters this round (queued + alive). */
  get remaining(): number {
    return this.queue.length + this.L.enemies.filter((e) => e.alive).length;
  }

  onKill(e: Enemy, styleMul: number): void {
    const base = e.kind === 'warhound' ? 150 : 10;
    const mod = this.modifier ? MOD_BONUS[this.modifier] : 1;
    const gain = Math.round(base * styleMul * mod);
    this.souls += gain;
    this.score += gain * this.round;
  }

  /** Player damage scaling under the active modifier. */
  playerDamageMul(): number {
    return this.modifier === 'glass' ? 2 : 1;
  }

  /** Enemy damage scaling under the active modifier and upgrades. */
  enemyDamageMul(kind: string): number {
    let m = this.damageMul;
    if (this.modifier === 'bladeOnly' && kind !== 'saw') m *= 0.2;
    return m;
  }

  update(dt: number, wdt: number): void {
    const L = this.L;
    const hud = L.ui.hud;
    hud.setScore(`${t('siege.souls')} ${this.souls}  ·  ${t('siege.score')} ${this.score}${this.modifier ? '  ·  ' + t('siege.mod.' + this.modifier) : ''}`);
    if (L.player.dead) return;
    if (this.phase === 'intermission') {
      this.timer -= dt;
      hud.objective(this.round === 0 ? t('siege.ready', { s: Math.ceil(this.timer) }) : t('siege.next', { s: Math.ceil(this.timer) }));
      hud.prompt(t('siege.shopPrompt'));
      L.audio.music.setIntensity('calm');
      if (this.timer <= 0) {
        hud.prompt(null);
        this.beginRound();
      }
      return;
    }
    L.audio.music.setIntensity('combat');
    // release monsters from the gates, a few at a time
    const frenzy = this.modifier === 'frenzy';
    const maxAlive = this.bossRound ? 99 : Math.min(5 + this.round, 14) + (frenzy ? 6 : 0);
    this.spawnT -= wdt;
    if (this.queue.length && this.spawnT <= 0 && L.enemies.filter((e) => e.alive).length < maxAlive) {
      const kind = this.queue.shift()!;
      const gate = this.pickGate();
      const hp = kind === 'warhound' ? L.diff.enemyHealth * (1 + 0.35 * (this.round / 5 - 1)) : this.hpMul;
      const e = L.summon(kind, gate[0] * CELL + rand(-0.6, 0.6), gate[1] * CELL + rand(-0.6, 0.6), { hpMul: hp, tracked: false });
      if (e && this.modifier === 'swift') e.speedMul = 1.35;
      this.spawned++;
      this.spawnT = this.bossRound ? 2.5 : Math.max(0.35, 1.1 - this.round * 0.04) * (frenzy ? 0.5 : 1);
    }
    const left = this.remaining;
    hud.objective(t('siege.status', { n: this.round, left }));
    if (!this.queue.length && left === 0 && this.spawned >= this.waveSize) this.endRound();
  }

  private pickGate(): [number, number] {
    // prefer gates far from the player
    const p = this.L.player.pos;
    const scored = SIEGE_SPAWNS.map((g) => ({ g, d: Math.hypot(g[0] * CELL - p.x, g[1] * CELL - p.z) }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 6);
    return scored[Math.floor(Math.random() * scored.length)].g;
  }

  private endRound(): void {
    const L = this.L;
    this.phase = 'intermission';
    this.timer = 12;
    if (this.modifier === 'darkness') L.lights.fogRange = [14, 70];
    const bonus = this.round * 15;
    this.souls += bonus;
    this.modifier = null;
    const p = L.player;
    p.health = Math.min(p.maxHealth, p.health + (this.bossRound ? 50 : 15));
    if (this.bossRound) p.armor = Math.min(PLAYER.maxArmor, p.armor + 50);
    L.refreshPickups();
    L.ui.hud.banner(t('siege.cleared', { n: this.round }), this.bossRound ? t('siege.houndDown') : t('siege.bonus', { n: bonus }));
    L.sound('level_complete', null, { volume: 0.6 });
    L.clearDead();
  }

  // ------------------------------------------------------------------ shop

  get shopOpen(): boolean {
    return this.phase === 'intermission' && !this.L.player.dead;
  }

  items(): ShopItem[] {
    const u = this.up;
    const perm = (id: keyof Upgrades, base: number, max: number): ShopItem => ({
      id, name: t('shop.' + id), desc: t('shop.' + id + '.d'), cost: base * (u[id] + 1), level: u[id], maxed: u[id] >= max,
    });
    return [
      perm('power', 120, 5),
      perm('vitality', 100, 4),
      perm('focus', 90, 3),
      perm('speed', 110, 3),
      { id: 'heal', name: t('shop.heal'), desc: t('shop.heal.d'), cost: 40 },
      { id: 'armor', name: t('shop.armor'), desc: t('shop.armor.d'), cost: 60 },
      { id: 'ammo', name: t('shop.ammo'), desc: t('shop.ammo.d'), cost: 70 },
      { id: 'grenades', name: t('shop.grenades'), desc: t('shop.grenades.d'), cost: 50 },
    ];
  }

  buy(id: string): boolean {
    const item = this.items().find((i) => i.id === id);
    if (!item || item.maxed || this.souls < item.cost) return false;
    const L = this.L;
    const p = L.player;
    this.souls -= item.cost;
    switch (id) {
      case 'power':
      case 'vitality':
      case 'focus':
      case 'speed':
        this.up[id]++;
        break;
      case 'heal':
        p.health = p.maxHealth;
        break;
      case 'armor':
        p.armor = Math.min(PLAYER.maxArmor, p.armor + 100);
        break;
      case 'ammo':
        for (const k of ['bullets', 'shells', 'rounds', 'rockets'] as AmmoType[]) p.ammo[k] = AMMO_MAX[k];
        break;
      case 'grenades':
        p.ammo.grenades = AMMO_MAX.grenades;
        break;
    }
    this.applyUpgrades();
    L.sound('pickup_weapon', null, { volume: 0.8 });
    return true;
  }

  applyUpgrades(): void {
    const p = this.L.player;
    const before = p.maxHealth;
    p.maxHealth = PLAYER.maxHealth + 25 * this.up.vitality;
    if (p.maxHealth > before) p.health += p.maxHealth - before;
    p.speedMul = 1 + 0.08 * this.up.speed;
    this.L.focusDuration = 5 + 1.5 * this.up.focus;
  }
}
