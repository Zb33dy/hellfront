import type { Grid } from './grid';
import type { TriggerAction, TriggerDef } from './types';

/** Fires level scripting actions on enter / pickup / wave-cleared / start events. */
export class TriggerSystem {
  readonly fired = new Set<string>();
  private pending: { at: number; actions: TriggerAction[] }[] = [];
  private time = 0;

  constructor(private defs: TriggerDef[], private grid: Grid, private run: (a: TriggerAction) => void) {}

  private fire(t: TriggerDef): void {
    if (this.fired.has(t.id)) return;
    this.fired.add(t.id);
    if (t.delay) this.pending.push({ at: this.time + t.delay, actions: t.actions });
    else t.actions.forEach(this.run);
  }

  start(): void {
    for (const t of this.defs) if ('start' in t.when) this.fire(t);
  }

  pickup(id: string): void {
    for (const t of this.defs) if ('pickup' in t.when && t.when.pickup === id) this.fire(t);
  }

  waveCleared(id: string): void {
    for (const t of this.defs) if ('waveCleared' in t.when && t.when.waveCleared === id) this.fire(t);
  }

  update(dt: number, px: number, pz: number): void {
    this.time += dt;
    const ci = this.grid.cellAt(px, pz);
    if (ci >= 0) {
      const cx = ci % this.grid.w, cy = Math.floor(ci / this.grid.w);
      for (const t of this.defs) if ('enter' in t.when && !this.fired.has(t.id) && this.grid.inRect(t.when.enter, cx, cy)) this.fire(t);
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].at <= this.time) {
        const p = this.pending.splice(i, 1)[0];
        p.actions.forEach(this.run);
      }
    }
  }

  /** Restores fired triggers from a save without re-running them. */
  restore(ids: string[]): void {
    ids.forEach((i) => this.fired.add(i));
  }
}
