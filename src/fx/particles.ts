import { Color4, ParticleSystem, RawTexture, Texture, Vector3, type Scene } from '@babylonjs/core';

export type ParticleKind = 'blood' | 'gore' | 'sparks' | 'smoke' | 'fire' | 'teleport' | 'splash' | 'trail' | 'dust';

interface KindDef {
  pool: number;
  capacity: number;
  additive: boolean;
  c1: [number, number, number, number];
  c2: [number, number, number, number];
  dead: [number, number, number, number];
  size: [number, number];
  life: [number, number];
  speed: [number, number];
  gravity: number;
  soft?: boolean;
}

const KINDS: Record<ParticleKind, KindDef> = {
  blood: { pool: 6, capacity: 160, additive: false, c1: [0.55, 0.02, 0.01, 1], c2: [0.35, 0, 0, 1], dead: [0.2, 0, 0, 0], size: [0.05, 0.13], life: [0.35, 0.8], speed: [1.5, 4.5], gravity: -11 },
  gore: { pool: 3, capacity: 220, additive: false, c1: [0.6, 0.03, 0.02, 1], c2: [0.3, 0.0, 0.0, 1], dead: [0.2, 0, 0, 0], size: [0.08, 0.22], life: [0.5, 1.2], speed: [2.5, 7], gravity: -12 },
  sparks: { pool: 6, capacity: 80, additive: true, c1: [1, 0.85, 0.4, 1], c2: [1, 0.5, 0.1, 1], dead: [0.6, 0.1, 0, 0], size: [0.03, 0.07], life: [0.12, 0.35], speed: [3, 8], gravity: -14 },
  smoke: { pool: 4, capacity: 80, additive: false, c1: [0.2, 0.19, 0.18, 0.55], c2: [0.12, 0.11, 0.1, 0.45], dead: [0.05, 0.05, 0.05, 0], size: [0.5, 1.4], life: [1.2, 2.6], speed: [0.4, 1.4], gravity: 0.9, soft: true },
  fire: { pool: 4, capacity: 120, additive: true, c1: [1, 0.75, 0.3, 1], c2: [1, 0.35, 0.05, 1], dead: [0.3, 0.05, 0, 0], size: [0.4, 1.2], life: [0.25, 0.65], speed: [2, 7], gravity: 2, soft: true },
  teleport: { pool: 4, capacity: 90, additive: true, c1: [0.5, 1, 0.6, 1], c2: [0.2, 1, 0.5, 1], dead: [0, 0.3, 0.1, 0], size: [0.05, 0.14], life: [0.5, 1.1], speed: [0.5, 2.5], gravity: 2.5 },
  splash: { pool: 3, capacity: 40, additive: true, c1: [0.4, 1, 0.3, 1], c2: [0.2, 0.7, 0.1, 1], dead: [0, 0.2, 0, 0], size: [0.04, 0.1], life: [0.3, 0.6], speed: [1, 2.5], gravity: -9 },
  trail: { pool: 8, capacity: 60, additive: true, c1: [1, 0.6, 0.15, 1], c2: [1, 0.3, 0.05, 1], dead: [0.2, 0.02, 0, 0], size: [0.08, 0.2], life: [0.15, 0.35], speed: [0.1, 0.6], gravity: 0.5, soft: true },
  dust: { pool: 1, capacity: 300, additive: true, c1: [0.5, 0.55, 0.6, 0.25], c2: [0.4, 0.45, 0.5, 0.15], dead: [0, 0, 0, 0], size: [0.02, 0.05], life: [6, 10], speed: [0.02, 0.1], gravity: 0 },
};

function makeTex(scene: Scene, soft: boolean): RawTexture {
  const n = soft ? 16 : 4;
  const d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      let a = 255;
      if (soft) {
        const dx = (x + 0.5) / n - 0.5, dy = (y + 0.5) / n - 0.5;
        // chunky pixel disc: 4×4 cells
        const qx = Math.floor((x / n) * 6) / 6 - 0.42, qy = Math.floor((y / n) * 6) / 6 - 0.42;
        a = Math.hypot(qx, qy) < 0.42 ? 255 : 0;
        void dx;
        void dy;
      }
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = a;
    }
  const t = RawTexture.CreateRGBATexture(d, n, n, scene, false, false, Texture.NEAREST_SAMPLINGMODE);
  t.hasAlpha = true;
  return t;
}

/** Pools of Babylon particle systems used as burst emitters. */
export class Particles {
  private pools = new Map<ParticleKind, { list: ParticleSystem[]; next: number }>();
  private dustSys: ParticleSystem | null = null;

  constructor(private scene: Scene) {
    const hard = makeTex(scene, false);
    const soft = makeTex(scene, true);
    for (const [kind, def] of Object.entries(KINDS) as [ParticleKind, KindDef][]) {
      if (kind === 'dust') continue;
      const list: ParticleSystem[] = [];
      for (let i = 0; i < def.pool; i++) list.push(this.make(def, def.soft ? soft : hard));
      this.pools.set(kind, { list, next: 0 });
    }
    void this.scene;
  }

  private make(def: KindDef, tex: Texture): ParticleSystem {
    const ps = new ParticleSystem('ps', def.capacity, this.scene);
    ps.particleTexture = tex;
    ps.emitter = new Vector3();
    ps.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
    ps.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
    ps.color1 = new Color4(...def.c1);
    ps.color2 = new Color4(...def.c2);
    ps.colorDead = new Color4(...def.dead);
    ps.minSize = def.size[0];
    ps.maxSize = def.size[1];
    ps.minLifeTime = def.life[0];
    ps.maxLifeTime = def.life[1];
    ps.minEmitPower = def.speed[0];
    ps.maxEmitPower = def.speed[1];
    ps.gravity = new Vector3(0, def.gravity, 0);
    ps.blendMode = def.additive ? ParticleSystem.BLENDMODE_ADD : ParticleSystem.BLENDMODE_STANDARD;
    ps.emitRate = 0;
    ps.manualEmitCount = 0;
    ps.updateSpeed = 1 / 60;
    ps.minAngularSpeed = -2;
    ps.maxAngularSpeed = 2;
    ps.start();
    return ps;
  }

  /**
   * Emits a burst. `dir` is the main direction; `spread` 0..1 widens the cone (1 = sphere).
   */
  emit(kind: ParticleKind, pos: Vector3, dir: Vector3, count: number, spread = 0.5, sizeMul = 1): void {
    const pool = this.pools.get(kind);
    if (!pool) return;
    const ps = pool.list[pool.next];
    pool.next = (pool.next + 1) % pool.list.length;
    (ps.emitter as Vector3).copyFrom(pos);
    const d = dir.lengthSquared() > 0 ? dir.normalizeToNew() : new Vector3(0, 1, 0);
    ps.direction1 = new Vector3(d.x - spread, d.y - spread, d.z - spread);
    ps.direction2 = new Vector3(d.x + spread, d.y + spread, d.z + spread);
    const def = KINDS[kind];
    ps.minSize = def.size[0] * sizeMul;
    ps.maxSize = def.size[1] * sizeMul;
    ps.manualEmitCount = (ps.manualEmitCount > 0 ? ps.manualEmitCount : 0) + count;
  }

  /** Slow floating dust motes in a volume (light shafts). */
  dust(min: Vector3, max: Vector3): void {
    const def = KINDS.dust;
    const ps = this.make(def, makeTex(this.scene, false));
    ps.minEmitBox = Vector3.Zero();
    ps.maxEmitBox = max.subtract(min);
    (ps.emitter as Vector3).copyFrom(min);
    ps.direction1 = new Vector3(-0.3, -0.2, -0.3);
    ps.direction2 = new Vector3(0.3, 0.3, 0.3);
    ps.manualEmitCount = -1;
    ps.emitRate = 30;
    ps.preWarmCycles = 120;
    ps.preWarmStepOffset = 5;
    this.dustSys = ps;
  }

  dispose(): void {
    for (const p of this.pools.values()) p.list.forEach((ps) => ps.dispose());
    this.dustSys?.dispose();
  }
}
