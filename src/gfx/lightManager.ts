import { Color3, type ShaderMaterial, Vector2, Vector3 } from '@babylonjs/core';
import { RENDER } from '../core/config';
import type { LightMode } from '../level/types';

const N = RENDER.maxDynamicLights;

export interface DynLight {
  pos: Vector3;
  color: Color3;
  intensity: number;
  range: number;
  mode: LightMode | 'fx';
  /** Fraction already baked into vertex colors (subtracted from the dynamic part). */
  baked: number;
  phase: number;
  life?: number;
  maxLife?: number;
  follow?: () => Vector3 | null;
  current: number;
  flickerHold: number;
  flickerVal: number;
}

/** Selects the N most relevant dynamic lights each frame and feeds them to all retro materials. */
export class LightManager {
  private world: DynLight[] = [];
  private fx: DynLight[] = [];
  private materials: ShaderMaterial[] = [];
  private posArr = new Array<number>(N * 3).fill(0);
  private colArr = new Array<number>(N * 4).fill(0);
  private time = 0;
  fogColor = new Color3(0.02, 0.018, 0.02);
  fogRange: [number, number] = [RENDER.fogStart, RENDER.fogEnd];
  bands = 0;
  private fogVec = new Vector2();

  register(m: ShaderMaterial): void {
    this.materials.push(m);
  }

  addWorld(pos: Vector3, color: Color3, intensity: number, range: number, mode: LightMode, baked: number): DynLight {
    const l: DynLight = { pos, color, intensity, range, mode, baked, phase: Math.random() * 10, current: 1, flickerHold: 0, flickerVal: 1 };
    this.world.push(l);
    return l;
  }

  addFx(pos: Vector3, color: Color3, intensity: number, range: number, life?: number, follow?: () => Vector3 | null): DynLight {
    const l: DynLight = { pos: pos.clone(), color, intensity, range, mode: 'fx', baked: 0, phase: 0, life, maxLife: life, follow, current: 1, flickerHold: 0, flickerVal: 1 };
    this.fx.push(l);
    return l;
  }

  update(dt: number, eye: Vector3): void {
    this.time += dt;
    const t = this.time;
    for (const l of this.world) {
      switch (l.mode) {
        case 'flicker':
          l.flickerHold -= dt;
          if (l.flickerHold <= 0) {
            const r = Math.random();
            l.flickerVal = r < 0.12 ? 0.05 : r < 0.25 ? 0.55 : 1;
            l.flickerHold = l.flickerVal < 1 ? 0.03 + Math.random() * 0.08 : 0.1 + Math.random() * 1.2;
          }
          l.current = l.flickerVal;
          break;
        case 'pulse':
          l.current = 0.62 + 0.38 * Math.sin(t * 2.4 + l.phase);
          break;
        case 'alarm': {
          const s = Math.max(0, Math.sin(t * 4.2 + l.phase));
          l.current = 0.12 + 1.1 * s * s;
          break;
        }
        default:
          l.current = 1;
      }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const l = this.fx[i];
      if (l.follow) {
        const p = l.follow();
        if (!p) {
          this.fx.splice(i, 1);
          continue;
        }
        l.pos.copyFrom(p);
      }
      if (l.life !== undefined && l.maxLife) {
        l.life -= dt;
        if (l.life <= 0) {
          this.fx.splice(i, 1);
          continue;
        }
        const k = l.life / l.maxLife;
        l.current = k * k;
      }
    }

    // Score candidates, keep the N best.
    const cands: { l: DynLight; s: number }[] = [];
    const consider = (l: DynLight) => {
      const d = Vector3.Distance(l.pos, eye);
      if (d > l.range + 22) return;
      const amp = Math.abs(l.current - l.baked) * l.intensity;
      if (amp < 0.02) return;
      cands.push({ l, s: (amp * l.range) / (1 + d) + (l.mode === 'fx' ? 2 : 0) });
    };
    this.world.forEach(consider);
    this.fx.forEach(consider);
    cands.sort((a, b) => b.s - a.s);

    for (let i = 0; i < N; i++) {
      const c = cands[i];
      if (c) {
        const l = c.l;
        const k = (l.current - l.baked) * l.intensity;
        this.posArr[i * 3] = l.pos.x;
        this.posArr[i * 3 + 1] = l.pos.y;
        this.posArr[i * 3 + 2] = l.pos.z;
        this.colArr[i * 4] = l.color.r * k;
        this.colArr[i * 4 + 1] = l.color.g * k;
        this.colArr[i * 4 + 2] = l.color.b * k;
        this.colArr[i * 4 + 3] = l.range;
      } else {
        this.colArr[i * 4 + 3] = 0;
      }
    }
    for (const m of this.materials) {
      m.setArray3('lightPos', this.posArr);
      m.setArray4('lightCol', this.colArr);
      m.setVector3('eyePos', eye);
      m.setColor3('fogColor', this.fogColor);
      m.setVector2('fogRange', this.fogVec.set(this.fogRange[0], this.fogRange[1]));
      m.setFloat('time', t);
      m.setFloat('bands', this.bands);
    }
  }

  get fxCount(): number {
    return this.fx.length;
  }
}
