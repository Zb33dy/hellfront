import { Engine } from '@babylonjs/core';

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const engine = new Engine(canvas, false, { stencil: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', antialias: false }, false);
  engine.disableManifestCheck = true;
  window.addEventListener('resize', () => engine.resize());
  return engine;
}

/** Render scale: 1 = 100%, 2 = 50%, 3 = 33%. The canvas is upscaled with nearest filtering via CSS. */
export function applyRenderScale(engine: Engine, scale: number): void {
  engine.setHardwareScalingLevel(scale);
  engine.resize();
}
