import { CELL, PLAYER, type EnemyKind } from '../core/config';
import { t } from '../core/i18n';
import { rand } from '../core/util';
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

export function siegeBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Siege mode: endless rounds. Every round spends a growing "budget" on monsters that pour out of
 * the gates, a few at a time; monster health grows with the round number. Every fifth round is a
 * Warhound hunt — only Warhounds, one more each time.
 */
export class SiegeController {
  round = 0;
  phase: 'intermission' | 'fighting' = 'intermission';
  private timer = 4;
  private queue: EnemyKind[] = [];
  private spawnT = 0;
  private waveSize = 0;
  private spawned = 0;
  readonly best = siegeBest();

  constructor(private L: LevelScene) {}

  get bossRound(): boolean {
    return this.round > 0 && this.round % 5 === 0;
  }

  private get hpMul(): number {
    return this.L.diff.enemyHealth * (1 + 0.07 * (this.round - 1));
  }

  start(): void {
    this.L.ui.hud.banner(t('siege.title'), t('siege.get'));
    this.L.hooks.voice('vs_start');
  }

  private beginRound(): void {
    this.round++;
    this.phase = 'fighting';
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
    if (this.bossRound) {
      L.ui.hud.banner(t('siege.round', { n: this.round }), t('siege.hounds'));
      L.hooks.voice('vs_hound');
      L.sound('pinky_charge', null, { pitch: 0.5, volume: 1.2 });
    } else {
      L.ui.hud.banner(t('siege.round', { n: this.round }), '');
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

  update(dt: number, wdt: number): void {
    const L = this.L;
    if (L.player.dead) return;
    if (this.phase === 'intermission') {
      this.timer -= dt;
      L.ui.hud.objective(this.round === 0 ? t('siege.ready', { s: Math.ceil(this.timer) }) : t('siege.next', { s: Math.ceil(this.timer) }));
      L.audio.music.setIntensity(this.round === 0 ? 'calm' : 'calm');
      if (this.timer <= 0) this.beginRound();
      return;
    }
    L.audio.music.setIntensity('combat');
    // release monsters from the gates, a few at a time
    const maxAlive = this.bossRound ? 99 : Math.min(5 + this.round, 14);
    this.spawnT -= wdt;
    if (this.queue.length && this.spawnT <= 0 && L.enemies.filter((e) => e.alive).length < maxAlive) {
      const kind = this.queue.shift()!;
      const gate = this.pickGate();
      const hp = kind === 'warhound' ? L.diff.enemyHealth * (1 + 0.35 * (this.round / 5 - 1)) : this.hpMul;
      L.summon(kind, gate[0] * CELL + rand(-0.6, 0.6), gate[1] * CELL + rand(-0.6, 0.6), { hpMul: hp, tracked: false });
      this.spawned++;
      this.spawnT = this.bossRound ? 2.5 : Math.max(0.35, 1.1 - this.round * 0.04);
    }
    const left = this.remaining;
    L.ui.hud.objective(t('siege.status', { n: this.round, left }));
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
    this.timer = this.bossRound ? 10 : 7;
    const p = L.player;
    p.health = Math.min(PLAYER.maxHealth, p.health + (this.bossRound ? 50 : 15));
    if (this.bossRound) p.armor = Math.min(PLAYER.maxArmor, p.armor + 50);
    L.refreshPickups();
    L.ui.hud.banner(t('siege.cleared', { n: this.round }), this.bossRound ? t('siege.houndDown') : '');
    L.sound('level_complete', null, { volume: 0.6 });
    // clear corpses so the arena stays readable
    L.clearDead();
  }
}
