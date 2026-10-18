import { Color4, FreeCamera, Scene, Vector3, type Engine } from '@babylonjs/core';
import { CELL } from '../core/config';
import type { Settings } from '../core/settingsStore';
import { LightManager } from '../gfx/lightManager';
import { createRetroMaterial } from '../gfx/retroMaterial';
import { SpriteBatch } from '../gfx/spriteBatch';
import { buildSpriteAtlas, getSpriteTexture, SPRITES } from '../gfx/sprites';
import { buildLevel, sampleLightGrid, type BuiltLevel } from '../level/levelBuilder';
import { Door } from '../level/doors';
import type { LevelData } from '../level/types';
import { PostFX } from '../fx/postProcess';
import { Particles } from '../fx/particles';

/** Animated title background: a slow camera glide through the hangar with idle demons. */
export class MenuScene {
  readonly scene: Scene;
  private camera: FreeCamera;
  private lights = new LightManager();
  private built: BuiltLevel;
  private batch: SpriteBatch;
  private post: PostFX;
  private particles: Particles;
  private t = 0;
  private path: Vector3[];
  private extras: { frame: string; x: number; z: number }[] = [];

  constructor(engine: Engine, data: LevelData, settings: Settings) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.01, 0.008, 0.01, 1);
    this.scene.skipPointerMovePicking = true;
    this.camera = new FreeCamera('menuCam', new Vector3(), this.scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.05;
    this.camera.maxZ = 220;
    this.camera.fov = 1.05;
    this.built = buildLevel(data, this.scene, this.lights);
    data.doors.forEach((d, i) => new Door(d, i, this.built.grid, this.scene, this.built.atlasMat, this.built.bakeLight));
    buildSpriteAtlas();
    const mat = createRetroMaterial('menuSprites', this.scene, getSpriteTexture(this.scene), 'sprite');
    this.lights.register(mat);
    this.lights.bands = settings.retroLight ? 9 : 0;
    this.batch = new SpriteBatch('menuBatch', this.scene, mat, 64);
    this.path = data.menuPath.map(([x, y, h]) => new Vector3(x * CELL, h, y * CELL));
    // a few idle demons and props as set dressing
    for (const th of data.things) {
      if (th.wave) continue;
      if (th.kind === 'zombieman' || th.kind === 'imp' || th.kind === 'barrel') {
        if (th.x < 35 && th.y < 20) this.extras.push({ frame: th.kind === 'barrel' ? 'barrel' : `${th.kind}_idle`, x: th.x * CELL, z: th.y * CELL });
      }
    }
    this.extras.push({ frame: 'pinky_idle', x: 18 * CELL, z: 17.5 * CELL });
    this.extras.push({ frame: 'imp_idle', x: 26 * CELL, z: 18.6 * CELL });
    this.extras.push({ frame: 'zombieman_die4', x: 13 * CELL, z: 6.5 * CELL });
    this.post = new PostFX(this.scene, this.camera, settings);
    this.post.setBaseChroma(8);
    this.particles = new Particles(this.scene);
    this.particles.dust(new Vector3(3 * CELL, 0.5, 4 * CELL), new Vector3(35 * CELL, 9, 20 * CELL));
  }

  private sample(u: number): Vector3 {
    const n = this.path.length;
    const f = ((u % 1) + 1) % 1 * n;
    const i = Math.floor(f);
    const t = f - i;
    const p0 = this.path[(i - 1 + n) % n], p1 = this.path[i], p2 = this.path[(i + 1) % n], p3 = this.path[(i + 2) % n];
    return Vector3.CatmullRom(p0, p1, p2, p3, t);
  }

  update(dt: number): void {
    this.t += dt;
    const u = this.t / 70;
    const pos = this.sample(u);
    const look = this.sample(u + 0.012);
    this.camera.position.copyFrom(pos);
    const d = look.subtract(pos);
    this.camera.rotation.y = Math.atan2(d.x, d.z);
    this.camera.rotation.x = -Math.atan2(d.y, Math.hypot(d.x, d.z)) + 0.08;
    this.camera.rotation.z = Math.sin(this.t * 0.3) * 0.015;
    this.lights.update(dt, pos);
    const m = this.camera.getWorldMatrix();
    this.batch.begin(Vector3.TransformNormal(new Vector3(1, 0, 0), m), Vector3.TransformNormal(new Vector3(0, 1, 0), m), Vector3.TransformNormal(new Vector3(0, 0, 1), m));
    for (const e of this.extras) {
      const l = sampleLightGrid(this.built.grid, this.built.lightGrid, e.x, e.z, [0, 0, 0]);
      this.batch.add(SPRITES[e.frame], e.x, 0, e.z, l);
    }
    this.batch.end();
    this.post.update(dt, 0);
  }

  applySettings(s: Settings): void {
    this.post.apply(s);
    this.lights.bands = s.retroLight ? 9 : 0;
  }

  render(): void {
    this.scene.render();
  }

  dispose(): void {
    this.post.dispose();
    this.particles.dispose();
    this.scene.dispose();
  }
}
