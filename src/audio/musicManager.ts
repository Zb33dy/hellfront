/**
 * Music is not part of this version. The bus exists and is wired into the mixer so
 * tracks can be added later without touching the rest of the audio code.
 */
export class MusicManager {
  readonly bus: GainNode;
  private current: AudioBufferSourceNode | null = null;

  constructor(private ctx: AudioContext, destination: AudioNode) {
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.6;
    this.bus.connect(destination);
  }

  setVolume(v: number): void {
    this.bus.gain.value = v;
  }

  /** Plays a decoded track on loop with a crossfade. No tracks ship yet. */
  play(buffer: AudioBuffer | null, fade = 1.5): void {
    this.stop(fade);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + fade);
    src.connect(g).connect(this.bus);
    src.start();
    this.current = src;
  }

  stop(fade = 1): void {
    if (!this.current) return;
    try {
      this.current.stop(this.ctx.currentTime + fade);
    } catch {
      /* ignore */
    }
    this.current = null;
  }
}
