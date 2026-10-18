import { Color4, DefaultRenderingPipeline, type Camera, type Scene } from '@babylonjs/core';
import type { Settings } from '../core/settingsStore';

/** Bloom, film grain, vignette and damage-driven chromatic aberration. */
export class PostFX {
  readonly pipeline: DefaultRenderingPipeline;
  private chroma = 0;
  private baseChroma = 0;

  constructor(scene: Scene, camera: Camera, settings: Settings) {
    const p = new DefaultRenderingPipeline('post', true, scene, [camera]);
    this.pipeline = p;
    p.samples = 1;
    p.fxaaEnabled = false;
    p.bloomEnabled = settings.bloom;
    p.bloomThreshold = 0.72;
    p.bloomWeight = 0.55;
    p.bloomKernel = 48;
    p.bloomScale = 0.5;
    p.imageProcessingEnabled = true;
    const ip = p.imageProcessing;
    ip.contrast = 1.18;
    ip.exposure = 1.05;
    ip.toneMappingEnabled = false;
    ip.vignetteEnabled = true;
    ip.vignetteWeight = 2.2;
    ip.vignetteStretch = 0.25;
    ip.vignetteColor = new Color4(0.02, 0, 0, 0);
    p.grainEnabled = settings.grain;
    p.grain.intensity = 9;
    p.grain.animated = true;
    p.chromaticAberrationEnabled = true;
    p.chromaticAberration.aberrationAmount = 0;
    p.chromaticAberration.radialIntensity = 1.2;
  }

  apply(settings: Settings): void {
    this.pipeline.bloomEnabled = settings.bloom;
    this.pipeline.grainEnabled = settings.grain;
  }

  /** Damage pulse (0..1). */
  hurt(k: number): void {
    this.chroma = Math.min(1, this.chroma + k);
  }

  setBaseChroma(v: number): void {
    this.baseChroma = v;
  }

  update(dt: number, lowHealth: number): void {
    this.chroma = Math.max(0, this.chroma - dt * 1.8);
    this.pipeline.chromaticAberration.aberrationAmount = (this.chroma * 70 + this.baseChroma) * (1 + lowHealth);
    const ip = this.pipeline.imageProcessing;
    ip.vignetteWeight = 2.2 + this.chroma * 3 + lowHealth * 3;
    ip.vignetteColor.r = 0.02 + lowHealth * 0.35 + this.chroma * 0.4;
  }

  dispose(): void {
    this.pipeline.dispose();
  }
}
