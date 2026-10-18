import { Mesh, VertexBuffer, VertexData, type Scene, type ShaderMaterial, type Vector3 } from '@babylonjs/core';
import type { SpriteFrame } from './sprites';

/**
 * All billboards (enemies, pickups, props, projectiles, debris) rebuilt on the CPU each frame
 * into one dynamic mesh → one draw call. Lighting comes in through vertex colors.
 */
export class SpriteBatch {
  readonly mesh: Mesh;
  private pos: Float32Array;
  private uv: Float32Array;
  private col: Float32Array;
  private nrm: Float32Array;
  private count = 0;
  private rx = 1;
  private rz = 0;
  private ux = 0;
  private uy = 1;
  private uz = 0;
  private fx = 0;
  private fy = 0;
  private fz = 1;

  constructor(name: string, scene: Scene, mat: ShaderMaterial, private capacity = 1024) {
    this.pos = new Float32Array(capacity * 12);
    this.uv = new Float32Array(capacity * 8);
    this.col = new Float32Array(capacity * 16);
    this.nrm = new Float32Array(capacity * 12);
    const idx = new Uint32Array(capacity * 6);
    for (let i = 0; i < capacity; i++) {
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    }
    for (let i = 0; i < capacity * 4; i++) this.nrm[i * 3 + 1] = 1;
    this.mesh = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = this.pos;
    vd.uvs = this.uv;
    vd.colors = this.col;
    vd.normals = this.nrm;
    vd.indices = idx;
    vd.applyToMesh(this.mesh, true);
    this.mesh.material = mat;
    this.mesh.isPickable = false;
    this.mesh.alwaysSelectAsActiveMesh = true;
  }

  /** Call once per frame before adding sprites. `right` is the camera right vector, `forward` its forward vector. */
  begin(right: Vector3, up: Vector3, forward: Vector3): void {
    this.count = 0;
    const l = Math.hypot(right.x, right.z) || 1;
    this.rx = right.x / l;
    this.rz = right.z / l;
    this.ux = up.x;
    this.uy = up.y;
    this.uz = up.z;
    this.fx = forward.x;
    this.fy = forward.y;
    this.fz = forward.z;
  }

  /**
   * Adds an upright (Y-axis) billboard, or a fully camera-facing one when `full` is set.
   * `light` is the vertex color (baked light or >1 for fullbright).
   */
  add(f: SpriteFrame, x: number, y: number, z: number, light: [number, number, number], opts: { scale?: number; full?: boolean; flip?: boolean; alpha?: number; depthBias?: number } = {}): void {
    if (this.count >= this.capacity) return;
    const s = opts.scale ?? 1;
    const w = f.w * s, h = f.h * s;
    let rx = this.rx, ry = 0, rz = this.rz;
    let ux = 0, uy = 1, uz = 0;
    if (opts.full) {
      ux = this.ux;
      uy = this.uy;
      uz = this.uz;
      ry = 0;
    }
    // Pull sprites slightly toward the camera so feet don't clip into steps.
    const bias = opts.depthBias ?? 0.15;
    x -= this.fx * bias;
    z -= this.fz * bias;
    y -= opts.full ? this.fy * bias : 0;
    const by = f.anchor === 'bottom' ? 0 : -h / 2;
    const hw = w / 2;
    const i = this.count * 12;
    const p = this.pos;
    // bottom-left, bottom-right, top-right, top-left
    const bx = x + ux * by, byy = y + uy * by, bz = z + uz * by;
    p[i] = bx - rx * hw; p[i + 1] = byy - ry * hw; p[i + 2] = bz - rz * hw;
    p[i + 3] = bx + rx * hw; p[i + 4] = byy + ry * hw; p[i + 5] = bz + rz * hw;
    p[i + 6] = bx + rx * hw + ux * h; p[i + 7] = byy + ry * hw + uy * h; p[i + 8] = bz + rz * hw + uz * h;
    p[i + 9] = bx - rx * hw + ux * h; p[i + 10] = byy - ry * hw + uy * h; p[i + 11] = bz - rz * hw + uz * h;
    const u = this.count * 8;
    const u0 = opts.flip ? f.u1 : f.u0, u1 = opts.flip ? f.u0 : f.u1;
    // atlas row 0 is the top of the image (v grows downward in our data)
    this.uv[u] = u0; this.uv[u + 1] = f.v1;
    this.uv[u + 2] = u1; this.uv[u + 3] = f.v1;
    this.uv[u + 4] = u1; this.uv[u + 5] = f.v0;
    this.uv[u + 6] = u0; this.uv[u + 7] = f.v0;
    const c = this.count * 16;
    for (let k = 0; k < 4; k++) {
      this.col[c + k * 4] = light[0];
      this.col[c + k * 4 + 1] = light[1];
      this.col[c + k * 4 + 2] = light[2];
      this.col[c + k * 4 + 3] = opts.alpha ?? 1;
    }
    this.count++;
  }

  end(): void {
    // collapse unused quads
    this.pos.fill(0, this.count * 12);
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.pos, false, false);
    this.mesh.updateVerticesData(VertexBuffer.UVKind, this.uv, false, false);
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.col, false, false);
  }

  get size(): number {
    return this.count;
  }
}
