import { WEAPON_SLOTS, WEAPON_SWITCH_TIME, type AmmoType, type WeaponId } from '../core/config';
import type { Input } from '../core/input';
import { damp } from '../core/util';
import type { GameCtx } from '../scenes/context';
import type { ViewModel } from '../ui/viewModel';
import { Chainsword } from './chainsword';
import { Pistol } from './pistol';
import { Shotgun } from './shotgun';
import { Sniper } from './sniper';
import type { Weapon } from './weapon';

/** Selection, raise/lower animation, firing cadence, ammo checks and view-model motion. */
export class WeaponSystem {
  readonly weapons: Record<WeaponId, Weapon> = { pistol: new Pistol(), shotgun: new Shotgun(), chainsword: new Chainsword(), sniper: new Sniper() };
  current: WeaponId = 'pistol';
  /** Weapon held before the current one (Z swaps back to it). */
  previous: WeaponId | null = null;
  private pending: WeaponId | null = null;
  private phase: 'ready' | 'lowering' | 'raising' = 'raising';
  private phaseT = 0;
  private cooldown = 0;
  private swayX = 0;
  private swayY = 0;
  private emptyClicked = false;
  holdTime = 0;

  get weapon(): Weapon {
    return this.weapons[this.current];
  }

  reset(id: WeaponId): void {
    this.current = id;
    this.pending = null;
    this.phase = 'raising';
    this.phaseT = 0;
    this.cooldown = 0;
  }

  request(id: WeaponId, ctx: GameCtx): void {
    if (!ctx.player.weapons.has(id)) return;
    if (id === this.current && this.phase !== 'lowering') return;
    this.pending = id;
    if (this.phase !== 'lowering') {
      this.phase = 'lowering';
      this.phaseT = 0;
    }
  }

  private hasAmmo(w: Weapon, ctx: GameCtx): boolean {
    return !w.ammo || ctx.player.ammo[w.ammo] >= w.ammoPerShot;
  }

  private bestWithAmmo(ctx: GameCtx): WeaponId {
    for (const id of ['shotgun', 'sniper', 'pistol', 'chainsword'] as WeaponId[])
      if (ctx.player.weapons.has(id) && this.hasAmmo(this.weapons[id], ctx)) return id;
    return 'pistol';
  }

  update(dt: number, input: Input, ctx: GameCtx): void {
    const p = ctx.player;
    if (!p.dead) {
      if (input.pressed('weapon1')) this.request('pistol', ctx);
      if (input.pressed('weapon2')) this.request('shotgun', ctx);
      if (input.pressed('weapon3')) this.request('chainsword', ctx);
      if (input.pressed('weapon4')) this.request('sniper', ctx);
      if (input.pressed('lastWeapon')) {
        const base = this.pending ?? this.current;
        let target = this.previous && this.previous !== base && p.weapons.has(this.previous) ? this.previous : null;
        if (!target) target = WEAPON_SLOTS.find((w) => w !== base && p.weapons.has(w) && this.hasAmmo(this.weapons[w], ctx)) ?? null;
        if (target) this.request(target, ctx);
      }
      if (input.wheel !== 0) {
        const owned = WEAPON_SLOTS.filter((w) => p.weapons.has(w));
        const base = this.pending ?? this.current;
        const i = owned.indexOf(base);
        const n = owned[(i + (input.wheel > 0 ? 1 : -1) + owned.length) % owned.length];
        this.request(n, ctx);
      }
    }
    this.phaseT += dt;
    if (this.phase === 'lowering' && this.phaseT >= WEAPON_SWITCH_TIME) {
      this.weapon.deselect(ctx);
      const next = this.pending ?? this.current;
      if (next !== this.current) this.previous = this.current;
      this.current = next;
      this.pending = null;
      this.phase = 'raising';
      this.phaseT = 0;
      ctx.sound('weapon_switch');
      this.weapon.select(ctx);
    } else if (this.phase === 'raising' && this.phaseT >= WEAPON_SWITCH_TIME) {
      this.phase = 'ready';
    }

    this.cooldown -= dt;
    const holding = input.mouseDown && !p.dead;
    this.holdTime = holding ? this.holdTime + dt : 0;
    if (!input.mouseDown) this.emptyClicked = false;
    const w = this.weapon;
    if (holding && this.phase === 'ready' && this.cooldown <= 0) {
      if (this.hasAmmo(w, ctx)) {
        if (w.ammo) p.ammo[w.ammo] -= w.ammoPerShot;
        w.fire(ctx);
        w.sinceFire = 0;
        this.cooldown = w.interval;
        if (w.ammo && !this.hasAmmo(w, ctx)) {
          // out of ammo: switch once the shot animation has played
          setTimeout(() => this.request(this.bestWithAmmo(ctx), ctx), 450);
        }
      } else if (!this.emptyClicked) {
        this.emptyClicked = true;
        ctx.sound('weapon_empty');
        this.request(this.bestWithAmmo(ctx), ctx);
      }
    }
    for (const id of WEAPON_SLOTS) this.weapons[id].update(dt, ctx, holding && id === this.current && this.phase === 'ready', id === this.current && !p.dead);

    // sway follows mouse motion, springs back
    this.swayX = damp(this.swayX, -input.mouseDX * 0.0009, 10, dt);
    this.swayY = damp(this.swayY, -input.mouseDY * 0.0009, 10, dt);
  }

  draw(vm: ViewModel, ctx: GameCtx, brightness: number): void {
    const p = ctx.player;
    const fs = this.weapon.frameState();
    let lower = 0;
    if (this.phase === 'lowering') lower = this.phaseT / WEAPON_SWITCH_TIME;
    else if (this.phase === 'raising') lower = 1 - this.phaseT / WEAPON_SWITCH_TIME;
    if (p.dead) lower = Math.min(1, p.deathTime * 1.5);
    const bob = p.bobAmount;
    const bx = Math.sin(p.bobPhase) * 0.035 * bob + this.swayX + fs.jitter;
    const by = Math.abs(Math.cos(p.bobPhase)) * 0.045 * bob + lower * 0.75 + fs.kick + this.swayY + p.landDip * 0.25;
    const flashBoost = fs.flash ? 0.6 : 0;
    vm.draw(this.current, fs.frame, bx, by, brightness + flashBoost, fs.flash, -p.roll * 0.6 + this.swayX * 0.5);
  }

  /** Returns the ammo type shown on the HUD for the current weapon. */
  get ammoType(): AmmoType | null {
    return this.weapon.ammo;
  }
}
