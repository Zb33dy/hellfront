import { Mesh, type Scene, type ShaderMaterial } from '@babylonjs/core';
import { CELL, DOOR, LIFT, type KeyColor } from '../core/config';
import type { TileName } from '../gfx/textures';
import { GeoBuilder } from './geometry';
import { CellKind, type Grid } from './grid';
import type { BoxCollider } from './levelBuilder';
import type { DoorDef, LiftDef } from './types';

type BakeFn = (x: number, y: number, z: number) => [number, number, number];

const DOOR_TILES: Record<DoorDef['type'], TileName> = {
  normal: 'door', red: 'doorRed', blue: 'doorBlue', yellow: 'doorYellow', closet: 'closet', secret: 'secretWall', locked: 'door',
};

export type DoorUseResult = 'opened' | 'closed' | 'needRed' | 'needBlue' | 'needYellow' | 'locked' | 'busy' | 'none';

export class Door {
  open = 0;
  state: 'closed' | 'opening' | 'open' | 'closing' = 'closed';
  timer = 0;
  locked: boolean;
  readonly key: KeyColor | null;
  readonly cells: number[] = [];
  readonly floor: number;
  readonly top: number;
  readonly slab: BoxCollider;
  readonly mesh: Mesh;
  readonly passAlongX: boolean;
  /** Set by the world each frame: something is standing in the doorway. */
  obstructed = false;
  onSound: ((kind: 'open' | 'close' | 'stop', door: Door) => void) | null = null;

  constructor(readonly def: DoorDef, readonly index: number, grid: Grid, scene: Scene, mat: ShaderMaterial, bake: BakeFn) {
    grid.eachRect(def.rect, (i) => this.cells.push(i));
    this.key = def.type === 'red' ? 'red' : def.type === 'blue' ? 'blue' : def.type === 'yellow' ? 'yellow' : null;
    this.locked = def.type === 'locked';
    const [rx, ry, rw, rh] = def.rect;
    const i0 = this.cells[0];
    this.floor = grid.floor[i0];
    this.top = grid.ceil[i0];
    const westOpen = !grid.isSolid(grid.idx(rx - 1, ry));
    const eastOpen = !grid.isSolid(grid.idx(rx + rw, ry));
    this.passAlongX = westOpen || eastOpen;
    const th = def.type === 'secret' ? CELL : DOOR.thickness;
    const x0 = rx * CELL, x1 = (rx + rw) * CELL, z0 = ry * CELL, z1 = (ry + rh) * CELL;
    if (this.passAlongX) {
      const cx = (x0 + x1) / 2;
      this.slab = { minX: cx - th / 2, maxX: cx + th / 2, minZ: z0, maxZ: z1, minY: this.floor, maxY: this.top };
    } else {
      const cz = (z0 + z1) / 2;
      this.slab = { minX: x0, maxX: x1, minZ: cz - th / 2, maxZ: cz + th / 2, minY: this.floor, maxY: this.top };
    }
    const g = new GeoBuilder();
    const tile = DOOR_TILES[def.type];
    const s = this.slab;
    const H = this.top - this.floor;
    // Faces: fit vertically, one tile per cell horizontally.
    const vf = (y: number) => ((this.top - y) / H) * 0.999;
    if (this.passAlongX) {
      g.face([s.maxX, s.maxY, s.minZ], [0, 0, s.maxZ - s.minZ], [0, -H, 0], [1, 0, 0], tile, (_x, y, z) => [z / CELL, vf(y)], 1);
      g.face([s.minX, s.maxY, s.maxZ], [0, 0, s.minZ - s.maxZ], [0, -H, 0], [-1, 0, 0], tile, (_x, y, z) => [-z / CELL, vf(y)], 1);
      g.face([s.minX, s.maxY, s.minZ], [s.maxX - s.minX, 0, 0], [0, -H, 0], [0, 0, -1], 'metalPanel', (x, y) => [x / CELL, -y / CELL]);
      g.face([s.maxX, s.maxY, s.maxZ], [s.minX - s.maxX, 0, 0], [0, -H, 0], [0, 0, 1], 'metalPanel', (x, y) => [x / CELL, -y / CELL]);
    } else {
      g.face([s.minX, s.maxY, s.maxZ], [s.maxX - s.minX, 0, 0], [0, -H, 0], [0, 0, 1], tile, (x, y) => [-x / CELL, vf(y)], 1);
      g.face([s.maxX, s.maxY, s.minZ], [s.minX - s.maxX, 0, 0], [0, -H, 0], [0, 0, -1], tile, (x, y) => [x / CELL, vf(y)], 1);
      g.face([s.minX, s.maxY, s.minZ], [0, 0, s.maxZ - s.minZ], [0, -H, 0], [-1, 0, 0], 'metalPanel', (_x, y, z) => [z / CELL, -y / CELL]);
      g.face([s.maxX, s.maxY, s.maxZ], [0, 0, s.minZ - s.maxZ], [0, -H, 0], [1, 0, 0], 'metalPanel', (_x, y, z) => [z / CELL, -y / CELL]);
    }
    g.face([s.minX, s.minY + 0.001, s.minZ], [s.maxX - s.minX, 0, 0], [0, 0, s.maxZ - s.minZ], [0, -1, 0], 'metalPanel', (x, _y, z) => [x / CELL, z / CELL]);
    g.bake((x, y, z) => bake(x, Math.min(y, this.top - 0.2), z));
    this.mesh = g.toMesh('door_' + def.id, scene);
    this.mesh.unfreezeWorldMatrix();
    this.mesh.material = mat;
  }

  get bottom(): number {
    return this.floor + this.open * (this.top - this.floor - 0.05);
  }

  /** Collider for the closed part of the door (null when fully open). */
  collider(): BoxCollider | null {
    if (this.open >= 0.999) return null;
    this.slab.minY = this.bottom;
    return this.slab;
  }

  use(keys: Set<KeyColor>, byPlayer: boolean): DoorUseResult {
    if (this.def.type === 'closet' && byPlayer) return 'none';
    if (this.locked) return 'locked';
    if (this.key && !keys.has(this.key)) return this.key === 'red' ? 'needRed' : this.key === 'blue' ? 'needBlue' : 'needYellow';
    if (this.state === 'closed' || this.state === 'closing') {
      this.state = 'opening';
      this.onSound?.('open', this);
      return 'opened';
    }
    if (this.state === 'open' && this.def.type !== 'secret' && byPlayer) {
      this.timer = 0;
      this.state = 'closing';
      this.onSound?.('close', this);
      return 'closed';
    }
    return 'busy';
  }

  forceOpen(): void {
    if (this.state === 'open' || this.state === 'opening') return;
    this.state = 'opening';
    this.onSound?.('open', this);
  }

  forceClose(): void {
    if (this.state === 'closed') return;
    this.state = 'closing';
    this.onSound?.('close', this);
  }

  /** Doors that stay open: secrets, closets, the exit. */
  private get latch(): boolean {
    return this.def.type === 'secret' || this.def.type === 'closet' || this.def.type === 'locked';
  }

  update(dt: number): void {
    const speed = 1 / DOOR.openTime;
    if (this.state === 'opening') {
      this.open = Math.min(1, this.open + dt * speed * (this.def.type === 'secret' ? 0.5 : 1));
      if (this.open >= 1) {
        this.state = 'open';
        this.timer = 0;
        this.onSound?.('stop', this);
      }
    } else if (this.state === 'open') {
      if (!this.latch) {
        this.timer += dt;
        if (this.timer > DOOR.stayOpen && !this.obstructed) {
          this.state = 'closing';
          this.onSound?.('close', this);
        }
      }
    } else if (this.state === 'closing') {
      if (this.obstructed) {
        this.state = 'opening';
        this.onSound?.('open', this);
      } else {
        this.open = Math.max(0, this.open - dt * speed);
        if (this.open <= 0) {
          this.state = 'closed';
          this.onSound?.('stop', this);
        }
      }
    }
    this.mesh.position.y = this.open * (this.top - this.floor - 0.05);
  }
}

export class Lift {
  y: number;
  target: number;
  moving = false;
  readonly cells: number[] = [];
  readonly mesh: Mesh;
  onSound: ((kind: 'start' | 'stop', lift: Lift) => void) | null = null;

  constructor(readonly def: LiftDef, private grid: Grid, scene: Scene, mat: ShaderMaterial, bake: BakeFn) {
    grid.eachRect(def.rect, (i) => this.cells.push(i));
    this.y = def.low;
    this.target = def.low;
    const [rx, ry, rw, rh] = def.rect;
    const g = new GeoBuilder();
    const depth = def.high - def.low + 0.3;
    g.box([rx * CELL, def.low - depth, ry * CELL], [(rx + rw) * CELL, def.low, (ry + rh) * CELL], 'hazard', 'liftTop', { fit: false });
    g.bake((x, _y, z) => {
      const c = bake(x, def.high, z);
      return [c[0] * 1.1, c[1] * 1.1, c[2] * 1.1];
    });
    this.mesh = g.toMesh('lift_' + def.id, scene);
    this.mesh.unfreezeWorldMatrix();
    this.mesh.material = mat;
  }

  activate(): boolean {
    if (this.moving) return false;
    this.target = this.target === this.def.low ? this.def.high : this.def.low;
    this.moving = true;
    this.onSound?.('start', this);
    return true;
  }

  contains(i: number): boolean {
    return this.grid.kind[i] === CellKind.Lift && this.cells.includes(i);
  }

  /** Returns the vertical delta applied this frame (riders follow it). */
  update(dt: number): number {
    if (!this.moving) return 0;
    const prev = this.y;
    const d = this.target - this.y;
    const step = Math.sign(d) * Math.min(Math.abs(d), LIFT.speed * dt);
    this.y += step;
    if (Math.abs(this.target - this.y) < 1e-4) {
      this.y = this.target;
      this.moving = false;
      this.onSound?.('stop', this);
    }
    for (const i of this.cells) this.grid.floor[i] = this.y;
    this.mesh.position.y = this.y - this.def.low;
    return this.y - prev;
  }
}
