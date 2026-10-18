import type { AmmoType, WeaponId } from '../core/config';
import type { GameCtx } from '../scenes/context';
import type { VMFrame } from '../ui/viewModel';

export interface WeaponFrameState {
  frame: VMFrame;
  flash: 0 | 1 | 2;
  /** Extra vertical kick of the view model (fraction of its height). */
  kick: number;
  /** Extra horizontal shake (fraction of width). */
  jitter: number;
}

export interface Weapon {
  readonly id: WeaponId;
  readonly ammo: AmmoType | null;
  readonly ammoPerShot: number;
  readonly interval: number;
  /** Seconds since the last shot (owned by the weapon system). */
  sinceFire: number;
  fire(ctx: GameCtx): void;
  update(dt: number, ctx: GameCtx, holding: boolean, active: boolean): void;
  frameState(): WeaponFrameState;
  select(ctx: GameCtx): void;
  deselect(ctx: GameCtx): void;
}
