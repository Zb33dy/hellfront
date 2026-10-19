import { WEAPONS } from '../core/config';
import type { SoundHandle } from '../audio/audioManager';

const SPIN = { time: 0.65, cooldown: 2.6, radius: 3.4, damage: 15 };
import type { GameCtx } from '../scenes/context';
import type { AltInput, Weapon, WeaponFrameState } from './weapon';

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
  private spinT = 0;
  private spinCD = 0;
  private spinTick = 0;

  /** Right click: spin a full circle, the blade shredding everything around you. */
  alt(dt: number, ctx: GameCtx, rmb: AltInput): number {
    this.spinCD -= dt;
    if (this.spinT <= 0) {
      if (!rmb.pressed) return 0;
      if (this.spinCD > 0) {
        ctx.sound('weapon_empty');
        return 0;
      }
      this.spinT = SPIN.time;
      this.spinCD = ctx.hasMod('chainsword') ? SPIN.cooldown * 0.5 : SPIN.cooldown;
      this.spinTick = 0;
      ctx.sound('chainsword_swing', null, { pitch: 0.8, volume: 1.3 });
      ctx.noise(ctx.player.pos, 20);
    }
    const step = Math.min(dt, this.spinT);
    this.spinT -= dt;
    ctx.player.yaw += ((Math.PI * 2) / SPIN.time) * step;
    this.spinTick -= dt;
    if (this.spinTick <= 0) {
      this.spinTick = 0.1;
      const up = ctx.hasMod('chainsword');
      const n = ctx.playerSpin(SPIN.radius * (up ? 1.3 : 1), SPIN.damage * (up ? 1.4 : 1));
      if (n > 0) {
        this.lastHit = 0;
        ctx.shake.add(0.12);
        if (this.swingSoundT <= 0) {
          ctx.sound('chainsword_hit');
          this.swingSoundT = 0.25;
        }
      }
    }
    this.swingT = 0;
    return this.spinT > 0 ? 0.15 : 0;
  }

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
    this.holding = (holding || this.spinT > 0) && active;
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
