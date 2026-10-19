import { Color3, Vector3 } from '@babylonjs/core';
import { FOCUS } from '../core/config';
import type { Input } from '../core/input';
import { t } from '../core/i18n';
import type { Enemy } from '../entities/enemy';
import type { SpriteBatch } from '../gfx/spriteBatch';
import { SPRITES } from '../gfx/sprites';
import type { LevelScene } from './levelScene';

export type AbilityId = 'focus' | 'cloak' | 'hook' | 'aegis' | 'jumppack';
/** Unlock order: focus from the start, one more after each finished chapter. */
export const ABILITY_ORDER: AbilityId[] = ['focus', 'cloak', 'hook', 'aegis', 'jumppack'];
const KEY = 'hellfront.abilities';

export function unlockedCount(): number {
  try {
    return Math.max(1, Math.min(5, Number(localStorage.getItem(KEY)) || 1));
  } catch {
    return 1;
  }
}

/** Finishing chapter n unlocks ability n+1. */
export function unlockAfterChapter(chapter: number): boolean {
  const before = unlockedCount();
  const next = Math.min(5, chapter + 1);
  if (next <= before) return false;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    /* ignore */
  }
  return true;
}

/** Abilities offered at the start of a chapter: everything unlocked, and never less than the chapter implies. */
export function availableFor(chapter: number, all = false): AbilityId[] {
  if (all) return [...ABILITY_ORDER];
  return ABILITY_ORDER.slice(0, Math.max(unlockedCount(), Math.min(5, chapter)));
}

interface Spec {
  /** Seconds to refill an empty meter on its own. */
  recharge: number;
  /** Meter gained per execution. */
  perExecute: number;
}

const SPEC: Record<AbilityId, Spec> = {
  focus: { recharge: FOCUS.recharge, perExecute: 0.1 },
  cloak: { recharge: 24, perExecute: 0.1 },
  hook: { recharge: 30, perExecute: 0.25 },
  aegis: { recharge: 22, perExecute: 0.1 },
  jumppack: { recharge: 20, perExecute: 0.15 },
};

/**
 * Q-ability runtime. One ability is equipped per chapter (or per five Siege rounds).
 *  - focus: the world slows down, you do not (drains while held on)
 *  - cloak: monsters cannot see you or start attacks for 6 s
 *  - hook: grapple the monster in your sights, fly to it, burst + stun everything around it
 *  - aegis: 7 s of immunity to ranged damage from the direction you face (melee still hurts)
 *  - jumppack: leap high, aim the yellow ring, press Q again to slam down for big area damage
 */
export class AbilityController {
  id: AbilityId = 'focus';
  meter = 1;
  active = false;
  private activeT = 0;
  private hookTarget: Enemy | null = null;
  private hookT = 0;
  private jumpPhase: 'none' | 'air' | 'slam' = 'none';
  private slamTarget: Vector3 | null = null;
  private aimTarget: Vector3 | null = null;

  constructor(private L: LevelScene) {}

  /** In the air with the jump pack: Q slams down. */
  get slamReady(): boolean {
    return this.id === 'jumppack' && this.jumpPhase === 'air';
  }

  equip(id: AbilityId): void {
    this.id = id;
    this.meter = 1;
    this.stop();
    this.L.ui.hud.setAbilityName(t('ability.' + id));
  }

  get name(): string {
    return t('ability.' + this.id);
  }

  onExecute(): void {
    this.meter = Math.min(1, this.meter + SPEC[this.id].perExecute);
  }

  /** World time scale this frame. */
  get worldScale(): number {
    return this.id === 'focus' && this.active ? FOCUS.worldScale : 1;
  }

  private stop(): void {
    this.active = false;
    this.L.focusOn = false;
    this.L.playerHidden = false;
    this.hookTarget = null;
    this.jumpPhase = 'none';
    this.slamTarget = null;
    this.L.ui.hud.setAbilityFx(null);
  }

  update(dt: number, input: Input): void {
    const L = this.L;
    const p = L.player;
    if (p.dead) {
      if (this.active) this.stop();
      return;
    }
    const pressed = input.pressed('focus');
    switch (this.id) {
      case 'focus': {
        if (pressed) {
          if (this.active) this.setFocus(false);
          else if (this.meter >= FOCUS.minToStart) this.setFocus(true);
        }
        if (this.active) {
          this.meter -= dt / L.focusDuration;
          if (this.meter <= 0) {
            this.meter = 0;
            this.setFocus(false);
          }
        } else this.recharge(dt);
        break;
      }
      case 'cloak':
      case 'aegis': {
        if (pressed && !this.active && this.meter >= 1) {
          this.active = true;
          this.activeT = this.id === 'cloak' ? 6 : 7;
          this.meter = 0;
          L.audio.play('teleport', { pitch: this.id === 'cloak' ? 1.6 : 0.6, volume: 0.6 });
          if (this.id === 'cloak') {
            L.playerHidden = true;
            // everyone loses you: attacks in progress are cancelled, the hunt goes to where you WERE
            for (const e of L.enemies) {
              e.seesPlayer = false;
              if (!e.alive) continue;
              const off = new Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12);
              e.lastSeen = p.pos.add(off);
              if (e.state === 'attack') e.setState('chase');
              e.parryTell = e.dangerTell = 0;
            }
          }
          L.ui.hud.setAbilityFx(this.id);
        }
        if (this.active) {
          this.activeT -= dt;
          if (this.activeT <= 0) {
            L.audio.play('teleport', { pitch: 1.2, volume: 0.4 });
            this.stop();
          }
        } else this.recharge(dt);
        break;
      }
      case 'hook':
        this.updateHook(dt, pressed);
        break;
      case 'jumppack':
        this.updateJump(dt, pressed);
        break;
    }
    L.ui.hud.setFocus(this.active ? Math.max(this.meter, this.activeT / 7) : this.meter, this.active);
  }

  private recharge(dt: number): void {
    this.meter = Math.min(1, this.meter + dt / SPEC[this.id].recharge);
  }

  private setFocus(on: boolean): void {
    this.active = on;
    this.L.focusOn = on;
    this.L.audio.play('teleport', { pitch: on ? 0.45 : 0.8, volume: 0.6 });
    if (on) this.L.ui.hud.flash('gold', 0.15);
  }

  // ------------------------------------------------------------------ hook

  private hookCandidate(): Enemy | null {
    const L = this.L;
    const p = L.player;
    const f = p.forward;
    let best: Enemy | null = null;
    let bestDot = 0.965;
    for (const e of L.enemies) {
      if (!e.alive) continue;
      const to = e.eye.subtract(p.eye);
      const d = to.length();
      if (d > 32 || d < 2) continue;
      const dot = Vector3.Dot(to.scale(1 / d), f);
      if (dot < bestDot || !L.world.los(p.eye, e.eye)) continue;
      bestDot = dot;
      best = e;
    }
    return best;
  }

  private updateHook(dt: number, pressed: boolean): void {
    const L = this.L;
    const p = L.player;
    if (!this.active) {
      this.recharge(dt);
      if (pressed) {
        if (this.meter < 1) {
          L.ui.hud.message(t('ability.notReady'));
          return;
        }
        const target = this.hookCandidate();
        if (!target) {
          L.ui.hud.message(t('ability.noTarget'));
          return;
        }
        this.active = true;
        this.meter = 0;
        this.hookTarget = target;
        this.hookT = 0;
        L.sound('chainsword_swing', null, { pitch: 0.8, volume: 1 });
        L.sound('impact_metal', target.eye, { pitch: 0.6 });
      }
      return;
    }
    const e = this.hookTarget!;
    this.hookT += dt;
    const to = new Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
    const d = to.length();
    p.invulnT = Math.max(p.invulnT, 0.2);
    if (d > e.radius + p.radius + 0.6 && this.hookT < 1.4 && e.solid) {
      const v = to.scale(1 / d).scale(30);
      p.vel.x = v.x;
      p.vel.z = v.z;
      p.vel.y = Math.max(p.vel.y, 1.5);
      return;
    }
    // impact: burst + stun around the target
    p.vel.x *= 0.2;
    p.vel.z *= 0.2;
    const c = e.pos.add(new Vector3(0, 1, 0));
    L.sound('barrel_explode', c, { pitch: 1.2, volume: 1.1 });
    L.particles.emit('sparks', c, new Vector3(0, 1, 0), 40, 2.4);
    L.particles.emit('fire', c, new Vector3(0, 1, 0), 20, 1.6);
    L.lights.addFx(c, new Color3(1, 0.7, 0.3), 4, 12, 0.35);
    L.shake.add(0.7);
    for (const o of L.enemies) {
      if (!o.alive) continue;
      const dd = Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z);
      if (dd > 5.5) continue;
      L.damageEnemy(o, o === e ? 90 : 55, o.pos.subtract(p.pos), 'blast', o.eye);
      if (o.alive && !o.def.bossName) {
        o.staggerT = Math.max(o.staggerT, 1.6);
        o.setState('pain');
      }
    }
    this.stop();
  }

  // ------------------------------------------------------------------ jump pack

  private updateJump(dt: number, pressed: boolean): void {
    const L = this.L;
    const p = L.player;
    if (this.jumpPhase === 'none') {
      this.recharge(dt);
      if (pressed) {
        if (this.meter < 1) {
          L.ui.hud.message(t('ability.notReady'));
          return;
        }
        this.meter = 0;
        this.active = true;
        this.jumpPhase = 'air';
        p.vel.y = 13;
        p.onGround = false;
        p.invulnT = Math.max(p.invulnT, 0.4);
        L.sound('barrel_explode', null, { pitch: 1.9, volume: 0.6 });
        L.particles.emit('smoke', p.pos.add(new Vector3(0, 0.2, 0)), new Vector3(0, 1, 0), 20, 1.2);
      }
      return;
    }
    if (this.jumpPhase === 'air') {
      // aim: where the view ray meets the ground (max 30 m)
      const hit = L.world.raycast(p.eye, p.forward, 30);
      if (hit.kind !== 'none' && hit.normal.y > 0.5) this.aimTarget = hit.point.clone();
      else {
        const f = p.forward;
        const pt = p.pos.add(new Vector3(f.x, 0, f.z).normalize().scale(10));
        pt.y = L.world.groundAt(pt.x, pt.z, 0.3, p.pos.y + 2, 30);
        this.aimTarget = pt;
      }
      if (pressed && this.aimTarget) {
        this.jumpPhase = 'slam';
        this.slamTarget = this.aimTarget.clone();
        L.sound('pinky_charge', null, { pitch: 1.5, volume: 0.8 });
      } else if (p.onGround && p.vel.y <= 0) {
        this.stop(); // landed without slamming
      }
      return;
    }
    // slam: dive at the marked spot
    const tgt = this.slamTarget!;
    const to = tgt.subtract(p.pos);
    const d = to.length();
    p.invulnT = Math.max(p.invulnT, 0.2);
    if (d > 0.6 && !p.onGround) {
      const v = to.scale(1 / d).scale(34);
      p.vel.copyFrom(v);
      return;
    }
    L.sound('barrel_explode', tgt, { pitch: 0.6, volume: 1.5 });
    L.particles.emit('fire', tgt.add(new Vector3(0, 0.3, 0)), new Vector3(0, 1, 0), 60, 3.2, 1.5);
    L.particles.emit('dust', tgt.add(new Vector3(0, 0.2, 0)), new Vector3(0, 1, 0), 40, 3);
    L.lights.addFx(tgt.add(new Vector3(0, 1, 0)), new Color3(1, 0.85, 0.3), 6, 18, 0.45);
    L.shake.add(1);
    for (const o of L.enemies) {
      if (!o.alive) continue;
      const dd = Math.hypot(o.pos.x - tgt.x, o.pos.z - tgt.z);
      if (dd > 7.5) continue;
      L.damageEnemy(o, 170 * (1 - dd / 9), o.pos.subtract(tgt), 'blast', o.eye);
    }
    p.vel.set(0, 0, 0);
    this.stop();
  }

  draw(b: SpriteBatch): void {
    const L = this.L;
    if (this.id === 'jumppack' && this.jumpPhase !== 'none') {
      const m = this.jumpPhase === 'slam' ? this.slamTarget : this.aimTarget;
      if (m) b.add(SPRITES['jumpRing' + (Math.floor(L.time * 8) % 2)], m.x, m.y + 0.15, m.z, [1, 1, 1], { full: true, scale: 3.2, depthBias: 0.3 });
    }
    if (this.id === 'hook' && this.hookTarget && this.active) {
      const a = L.player.eye.add(new Vector3(0, -0.4, 0));
      const c = this.hookTarget.eye;
      const seg = c.subtract(a);
      const n = Math.max(2, Math.ceil(seg.length() / 0.5));
      for (let i = 1; i <= n; i++) {
        const q = a.add(seg.scale(i / n));
        b.add(SPRITES.chainLink, q.x, q.y, q.z, [1, 1, 1], { full: true, scale: 0.6, depthBias: 0.1 });
      }
    }
  }
}
