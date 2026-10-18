import { WEAPONS } from '../core/config';
import type { SoundHandle } from '../audio/audioManager';
import type { GameCtx } from '../scenes/context';
import type { Weapon, WeaponFrameState } from './weapon';

/** Melee, no ammo. Idle engine loop that screams while attacking; rapid damage ticks with lunge. */
export class Chainsword implements Weapon {
  readonly id = 'chainsword' as const;
  readonly ammo = null;
  readonly ammoPerShot = 0;
  readonly interval = WEAPONS.chainsword.fireInterval;
  sinceFire = 10;
  private loop: SoundHandle | null = null;
  private t = 0;
  private swingT = 10;
  private holding = false;
  private swingSoundT = 0;
  private lastHit = 10;

  fire(ctx: GameCtx): void {
    const r = ctx.playerMelee(WEAPONS.chainsword);
    this.swingT = 0;
    if (r === 'enemy') {
      this.lastHit = 0;
      ctx.shake.add(WEAPONS.chainsword.shake);
    } else if (r === 'wall') {
      ctx.shake.add(0.05);
    }
    if (this.swingSoundT <= 0) {
      ctx.sound(r === 'enemy' ? 'chainsword_hit' : 'chainsword_swing', null, { volume: r === 'wall' ? 0.6 : 1 });
      this.swingSoundT = r === 'enemy' ? 0.32 : 0.45;
    }
    ctx.noise(ctx.player.pos, WEAPONS.chainsword.noise);
  }

  update(dt: number, ctx: GameCtx, holding: boolean, active: boolean): void {
    this.sinceFire += dt;
    this.t += dt;
    this.swingT += dt;
    this.lastHit += dt;
    this.swingSoundT -= dt;
    this.holding = holding && active;
    if (active && !this.loop?.playing) this.loop = ctx.sound('chainsword_idle', null, { loop: true });
    if (this.loop) {
      this.loop.setPitch(this.holding ? 1.45 : 1);
      this.loop.setVolume(this.holding ? 1.5 : 1);
    }
  }

  frameState(): WeaponFrameState {
    const attacking = this.holding || this.swingT < 0.15;
    const rev = Math.floor(this.t * 18) % 2;
    let frame: WeaponFrameState['frame'];
    if (attacking) frame = rev ? 'swing0' : 'swing1';
    else frame = rev ? 'idle0' : 'idle1';
    const jitter = (Math.random() - 0.5) * (attacking ? 0.02 : 0.006);
    return { frame, flash: 0, kick: this.lastHit < 0.08 ? 0.02 : (Math.random() - 0.5) * 0.008, jitter };
  }

  select(ctx: GameCtx): void {
    this.loop?.stop(0.05);
    this.loop = ctx.sound('chainsword_idle', null, { loop: true });
  }

  deselect(): void {
    this.loop?.stop(0.15);
    this.loop = null;
  }
}
