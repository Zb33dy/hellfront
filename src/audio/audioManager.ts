import type { Vector3 } from '@babylonjs/core';
import { SOUNDS, type SoundDef, type SoundId } from './audioManifest';
import { synthesize, synthesizeChatter } from './proceduralSfx';
import { VOICE_LINES, estimateDuration, type VoiceLine } from './subtitles';
import { MusicManager } from './musicManager';

// Asset URLs that actually exist on disk (Vite resolves them at build time).
const FILES = import.meta.glob('../assets/audio/**/*.{mp3,ogg,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const fileUrl = (rel: string): string | undefined => FILES[`../assets/audio/${rel}`];

export interface PlayOpts {
  pos?: Vector3;
  volume?: number;
  pitch?: number;
  loop?: boolean;
  refDistance?: number;
  occluded?: boolean;
}

export interface SoundHandle {
  stop(fade?: number): void;
  setPosition(p: Vector3): void;
  setVolume(v: number): void;
  setPitch(p: number): void;
  readonly playing: boolean;
}

const NULL_HANDLE: SoundHandle = { stop() {}, setPosition() {}, setVolume() {}, setPitch() {}, playing: false };

/**
 * Web Audio mixer: master → (sfx → duck) / voice / ui / amb / music.
 * SFX ducks under voice lines. Enemies and world sounds are 3D (HRTF panners).
 */
export class AudioManager {
  ctx: AudioContext;
  private master: GainNode;
  private sfx: GainNode;
  private duck: GainNode;
  private voiceBus: GainNode;
  private ui: GainNode;
  private amb: GainNode;
  readonly music: MusicManager;
  private buffers = new Map<string, AudioBuffer[]>();
  private voiceBuffers = new Map<string, AudioBuffer>();
  private lastVariant = new Map<string, number>();
  private radioIn: GainNode;
  private noiseBed: AudioBuffer;
  private currentVoice: { src: AudioBufferSourceNode; bed: AudioBufferSourceNode } | null = null;
  private activeCount = 0;
  loaded = false;
  stats = { files: 0, procedural: 0, voiceFiles: 0 };

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain();
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    this.master.connect(limiter).connect(c.destination);
    this.duck = c.createGain();
    this.duck.connect(this.master);
    this.sfx = c.createGain();
    this.sfx.connect(this.duck);
    this.amb = c.createGain();
    this.amb.connect(this.duck);
    this.ui = c.createGain();
    this.ui.connect(this.master);
    this.voiceBus = c.createGain();
    this.voiceBus.connect(this.master);
    this.music = new MusicManager(c, this.master);

    // Radio comms chain: band-limit, saturate, presence bump.
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 380;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3300;
    const peak = c.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 1700;
    peak.gain.value = 6;
    peak.Q.value = 1.2;
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.4) / Math.tanh(2.4);
    }
    shaper.curve = curve;
    this.radioIn = c.createGain();
    this.radioIn.gain.value = 0.9;
    this.radioIn.connect(hp).connect(peak).connect(shaper).connect(lp).connect(this.voiceBus);

    this.noiseBed = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noiseBed.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;

    const unlock = () => {
      if (this.ctx.state !== 'running') void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  setVolumes(master: number, sfx: number, voice: number): void {
    this.master.gain.value = master;
    this.sfx.gain.value = sfx;
    this.amb.gain.value = sfx;
    this.ui.gain.value = Math.min(1, sfx * 1.1);
    this.voiceBus.gain.value = voice;
  }

  async load(onProgress?: (p: number) => void): Promise<void> {
    if (this.loaded) return;
    const ids = Object.keys(SOUNDS) as SoundId[];
    const total = ids.length + VOICE_LINES.length;
    let done = 0;
    const tick = () => onProgress?.(++done / total);
    await Promise.all(
      ids.map(async (id) => {
        const def: SoundDef = SOUNDS[id];
        const bufs: AudioBuffer[] = [];
        for (let i = 0; i < def.files.length; i++) {
          const b = await this.fetchBuffer(def.files[i]);
          if (b) {
            bufs.push(b);
            this.stats.files++;
          }
        }
        if (!bufs.length) {
          const n = Math.max(1, Math.min(def.files.length, 3));
          for (let i = 0; i < n; i++) bufs.push(synthesize(this.ctx, def.proc, i));
          this.stats.procedural++;
        }
        this.buffers.set(id, bufs);
        tick();
      }),
    );
    await Promise.all(
      VOICE_LINES.map(async (l) => {
        const b = await this.fetchBuffer(l.file);
        if (b) {
          this.voiceBuffers.set(l.id, b);
          this.stats.voiceFiles++;
        }
        tick();
      }),
    );
    this.loaded = true;
  }

  private async fetchBuffer(rel: string): Promise<AudioBuffer | null> {
    const url = fileUrl(rel);
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  setListener(pos: Vector3, forward: Vector3): void {
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos.x, t, 0.01);
      l.positionY.setTargetAtTime(pos.y, t, 0.01);
      l.positionZ.setTargetAtTime(-pos.z, t, 0.01);
      // Babylon is left-handed; Web Audio is right-handed → mirror Z.
      l.forwardX.setTargetAtTime(forward.x, t, 0.01);
      l.forwardY.setTargetAtTime(forward.y, t, 0.01);
      l.forwardZ.setTargetAtTime(-forward.z, t, 0.01);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(pos.x, pos.y, -pos.z);
      l.setOrientation(forward.x, forward.y, -forward.z, 0, 1, 0);
    }
  }

  private setPannerPos(p: PannerNode, v: Vector3): void {
    // Babylon (left-handed) → Web Audio (right-handed): mirror Z, same as the listener.
    p.positionX.value = v.x;
    p.positionY.value = v.y;
    p.positionZ.value = -v.z;
  }

  play(id: SoundId, opts: PlayOpts = {}): SoundHandle {
    if (this.ctx.state !== 'running' || !this.loaded) return NULL_HANDLE;
    const bufs = this.buffers.get(id);
    if (!bufs?.length) return NULL_HANDLE;
    if (this.activeCount > 48 && !opts.loop) return NULL_HANDLE;
    const def: SoundDef = SOUNDS[id];
    // avoid repeating the same variant twice in a row
    let vi = Math.floor(Math.random() * bufs.length);
    if (bufs.length > 1 && vi === this.lastVariant.get(id)) vi = (vi + 1) % bufs.length;
    this.lastVariant.set(id, vi);

    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = bufs[vi];
    src.loop = opts.loop ?? def.loop ?? false;
    const pj = def.pitchJitter ?? 0;
    src.playbackRate.value = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * pj);
    const g = c.createGain();
    const vj = def.volJitter ?? 0;
    const baseVol = def.volume * (opts.volume ?? 1);
    g.gain.value = baseVol * (1 + (Math.random() * 2 - 1) * vj);
    src.connect(g);
    let tail: AudioNode = g;
    let panner: PannerNode | null = null;
    if (opts.occluded) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      tail.connect(f);
      tail = f;
    }
    if (opts.pos) {
      panner = c.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = opts.refDistance ?? def.refDistance ?? 3;
      panner.maxDistance = 80;
      panner.rolloffFactor = 1.1;
      this.setPannerPos(panner, opts.pos);
      tail.connect(panner);
      tail = panner;
    }
    const bus = def.bus === 'ui' ? this.ui : def.bus === 'amb' ? this.amb : def.bus === 'voice' ? this.voiceBus : this.sfx;
    tail.connect(bus);
    src.start();
    this.activeCount++;
    let playing = true;
    const worldSound = bus === this.sfx || bus === this.amb;
    const stopNow = () => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    };
    if (worldSound) this.worldSounds.add(stopNow);
    src.onended = () => {
      playing = false;
      this.activeCount--;
      this.worldSounds.delete(stopNow);
      g.disconnect();
      panner?.disconnect();
    };
    return {
      stop: (fade = 0.05) => {
        if (!playing) return;
        const t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + fade);
        try {
          src.stop(t + fade + 0.01);
        } catch {
          /* already stopped */
        }
      },
      setPosition: (p: Vector3) => {
        if (panner) this.setPannerPos(panner, p);
      },
      setVolume: (vv: number) => g.gain.setTargetAtTime(def.volume * vv, c.currentTime, 0.05),
      setPitch: (pp: number) => src.playbackRate.setTargetAtTime(pp, c.currentTime, 0.05),
      get playing() {
        return playing;
      },
    };
  }

  /** Plays a radio voice line through the comms filter; resolves with its duration. */
  playVoice(line: VoiceLine): number {
    if (this.ctx.state !== 'running') return estimateDuration(line.en);
    this.stopVoice();
    const c = this.ctx;
    let buf = this.voiceBuffers.get(line.id);
    let chatter = false;
    if (!buf) {
      buf = synthesizeChatter(c, estimateDuration(line.en), line.id.length * 131);
      chatter = true;
    }
    if (line.dry && chatter) return estimateDuration(line.en); // no recording yet: subtitle only
    if (line.dry && !chatter) {
      // boss voice: dry, a touch of low-end weight, no squelch or static bed
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = 1.15;
      src.connect(g).connect(this.voiceBus);
      src.start(c.currentTime + 0.05);
      const bed = c.createBufferSource();
      this.currentVoice = { src, bed };
      this.duckTo(0.6, 0.15);
      src.onended = () => {
        if (this.currentVoice?.src === src) {
          this.currentVoice = null;
          this.duckTo(1, 0.6);
        }
      };
      return buf.duration + 0.1;
    }
    this.play('radio_click');
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = chatter ? 0.35 : 1;
    src.connect(g).connect(this.radioIn);
    const bed = c.createBufferSource();
    bed.buffer = this.noiseBed;
    bed.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 0.7;
    const bg = c.createGain();
    bg.gain.value = 0.035;
    bed.connect(bp).connect(bg).connect(this.voiceBus);
    const t = c.currentTime + 0.12;
    src.start(t);
    bed.start(c.currentTime);
    const dur = buf.duration;
    bed.stop(t + dur + 0.15);
    this.duckTo(0.5, 0.15);
    this.currentVoice = { src, bed };
    src.onended = () => {
      if (this.currentVoice?.src === src) {
        this.currentVoice = null;
        this.duckTo(1, 0.6);
        this.play('radio_click');
      }
    };
    return dur + 0.25;
  }

  private narration: AudioBufferSourceNode | null = null;
  private narrationCache = new Map<string, Promise<AudioBuffer | null>>();

  /** Plays a narration file (assets/audio/narration/<id>.mp3) dry on the voice bus. Returns its length, or 0. */
  async playNarration(id: string): Promise<number> {
    this.stopNarration();
    const url = fileUrl(`narration/${id}.mp3`);
    if (!url) return 0;
    let p = this.narrationCache.get(url);
    if (!p) {
      p = fetch(url).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).catch(() => null);
      this.narrationCache.set(url, p);
    }
    const buf = await p;
    if (!buf) return 0;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 1.1;
    src.connect(g).connect(this.voiceBus);
    src.start(this.ctx.currentTime + 0.4);
    this.narration = src;
    return buf.duration + 0.4;
  }

  stopNarration(): void {
    try {
      this.narration?.stop();
    } catch {
      /* ignore */
    }
    this.narration = null;
  }

  /** Every sfx/ambience source still playing (level teardown silences them all). */
  private worldSounds = new Set<() => void>();

  stopWorldSounds(): void {
    for (const stop of [...this.worldSounds]) stop();
    this.worldSounds.clear();
  }

  stopVoice(): void {
    if (!this.currentVoice) return;
    try {
      this.currentVoice.src.stop();
      this.currentVoice.bed.stop();
    } catch {
      /* ignore */
    }
    this.currentVoice = null;
    this.duckTo(1, 0.3);
  }

  private duckTo(v: number, time: number): void {
    const t = this.ctx.currentTime;
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(this.duck.gain.value, t);
    this.duck.gain.linearRampToValueAtTime(v, t + time);
  }

  /** Lowers the world (sfx/amb) — used by pause and death screens. */
  muffle(on: boolean): void {
    this.duckTo(on ? 0.25 : 1, 0.3);
  }

  hasVoiceFile(id: string): boolean {
    return this.voiceBuffers.has(id);
  }
}
