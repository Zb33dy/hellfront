/**
 * Procedural soundtrack: original industrial-metal tracks synthesized live in Web Audio
 * (distorted power-chord guitars, palm mutes, synth drums, bass and an electronic lead),
 * plus a dark ambient pad for quiet moments. Intensity crossfades between the two.
 */

type Step = { semi: number; open: boolean; len: number } | null;

interface Section {
  bars: number;
  riff: Step[][]; // one array of 16 steps per bar (cycled)
  kick: string;
  snare: string;
  hat: string;
  lead?: number[]; // 16th-note arpeggio (semitones from root, -1 = rest)
  crashOnStart?: boolean;
}

interface Song {
  bpm: number;
  root: number; // Hz of the low guitar root
  sections: Section[];
  order: number[];
}

/** "0m 0m . 3O ~ ." → steps. m = palm-muted chug, O = open power chord, . = rest, ~ = hold. */
function riff(s: string): Step[] {
  const out: Step[] = [];
  for (const tok of s.trim().split(/\s+/)) {
    if (tok === '.') out.push(null);
    else if (tok === '~') {
      for (let i = out.length - 1; i >= 0; i--) {
        const st = out[i];
        if (st) {
          st.len++;
          break;
        }
      }
      out.push(null);
    } else out.push({ semi: parseInt(tok, 10), open: tok.endsWith('O'), len: 1 });
  }
  while (out.length < 16) out.push(null);
  return out.slice(0, 16);
}

const SONGS: Record<string, Song> = {
  // Campaign combat track: galloping E-phrygian riffs, a lead-driven bridge and a half-time breakdown.
  hellfront: {
    bpm: 168,
    root: 82.41,
    sections: [
      {
        bars: 4,
        riff: [
          riff('0m 0m . 0m 0m . 0m 0m 1O ~ 0m 0m . 0m 3O ~'),
          riff('0m 0m . 0m 0m . 0m 0m 5O ~ 3O ~ 1O ~ 0m .'),
        ],
        kick: 'K.KK..KK..KK..KK',
        snare: '....S.......S...',
        hat: 'h.h.h.h.h.h.h.h.',
        crashOnStart: true,
      },
      {
        bars: 4,
        riff: [
          riff('0O ~ ~ ~ 0m 0m 0m 0m 3O ~ ~ ~ 0m 0m 0m 0m'),
          riff('5O ~ ~ ~ 0m 0m 0m 0m 6O ~ 5O ~ 3O ~ 1O ~'),
        ],
        kick: 'K...K...K...K.K.',
        snare: '....S.......S...',
        hat: 'hhhhhhhhhhhhhhhh',
        lead: [12, 15, 19, 24, 19, 15, 13, 15, 12, 15, 19, 22, 24, 22, 19, 15],
        crashOnStart: true,
      },
      {
        bars: 2,
        riff: [riff('0m . 0m 0m . . 0m . 0m 0m . . 1O ~ ~ .'), riff('0m . 0m 0m . . 0m . 0m 0m . . -1O ~ ~ .')],
        kick: 'K.KK..K.K.KK..K.',
        snare: '........S.......',
        hat: 'c...c...c...c...',
        crashOnStart: true,
      },
    ],
    order: [0, 0, 1, 0, 2, 1],
  },
  // Siege track: faster, more electronic, chromatic stabs and a screaming lead.
  siege: {
    bpm: 182,
    root: 77.78, // D#2 — tuned down for weight
    sections: [
      {
        bars: 4,
        riff: [riff('0m 0m 1O . 0m 0m 1O . 0m 0m 4O . 0m 3O ~ .'), riff('0m 0m 1O . 0m 0m 1O . 0m 6O ~ 5O ~ 4O 3O .')],
        kick: 'K.K.K.K.K.K.K.K.',
        snare: '....S.......S..S',
        hat: '.h.h.h.h.h.h.h.h',
        lead: [24, -1, 24, 25, -1, 24, -1, 22, 24, -1, 24, 25, 28, 27, 25, 22],
        crashOnStart: true,
      },
      {
        bars: 4,
        riff: [riff('0O ~ 0m 0m 1O ~ 0m 0m 0O ~ 0m 0m 6O ~ 5O ~'), riff('0O ~ 0m 0m 1O ~ 0m 0m 3O ~ 4O ~ 3O ~ 1O ~')],
        kick: 'KKKKKKKKKKKKKKKK',
        snare: '....S.......S...',
        hat: 'h.h.h.h.h.h.h.h.',
        crashOnStart: true,
      },
      {
        bars: 2,
        riff: [riff('0m . . 0m . . 0m . 0m . . 0m . . 1O ~'), riff('0m . . 0m . . 0m . 0m . . 0m 6O ~ 7O ~')],
        kick: 'K..K..K.K..K..K.',
        snare: '........S.......',
        hat: 'c.......c.......',
        lead: [12, 13, 16, 19, 12, 13, 16, 19, 12, 13, 16, 19, 24, 22, 19, 16],
        crashOnStart: true,
      },
    ],
    order: [0, 1, 0, 2, 1, 1],
  },
};

export type MusicIntensity = 'off' | 'calm' | 'combat';

export class MusicManager {
  readonly bus: GainNode;
  private band: GainNode;
  private padGain: GainNode;
  private gtrOpen!: GainNode;
  private gtrMute!: GainNode;
  private leadIn!: GainNode;
  private noise: AudioBuffer;
  private song: Song | null = null;
  private songId = '';
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private sectionIdx = 0;
  private barInSection = 0;
  private pad: { stop(): void } | null = null;
  private intensity: MusicIntensity = 'off';

  constructor(private ctx: AudioContext, destination: AudioNode) {
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.55;
    this.bus.connect(destination);
    this.band = ctx.createGain();
    this.band.gain.value = 0;
    this.band.connect(this.bus);
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padGain.connect(this.bus);
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
    this.buildChains();
  }

  private buildChains(): void {
    const c = this.ctx;
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 9) * 0.9;
    }
    const chain = (lp: number, vol: number): GainNode => {
      const input = c.createGain();
      const pre = c.createBiquadFilter();
      pre.type = 'highpass';
      pre.frequency.value = 110;
      const shaper = c.createWaveShaper();
      shaper.curve = curve;
      shaper.oversample = '2x';
      const mid = c.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 750;
      mid.gain.value = -6;
      mid.Q.value = 0.8;
      const cab = c.createBiquadFilter();
      cab.type = 'lowpass';
      cab.frequency.value = lp;
      cab.Q.value = 0.9;
      const out = c.createGain();
      out.gain.value = vol;
      input.connect(pre).connect(shaper).connect(mid).connect(cab).connect(out).connect(this.band);
      return input;
    };
    this.gtrOpen = chain(4200, 0.32);
    this.gtrMute = chain(1500, 0.42);
    // lead: resonant saw through a feedback delay
    this.leadIn = c.createGain();
    const lf = c.createBiquadFilter();
    lf.type = 'lowpass';
    lf.frequency.value = 3200;
    lf.Q.value = 4;
    const delay = c.createDelay(1);
    delay.delayTime.value = 0.27;
    const fb = c.createGain();
    fb.gain.value = 0.32;
    const lout = c.createGain();
    lout.gain.value = 0.11;
    this.leadIn.connect(lf).connect(lout).connect(this.band);
    lf.connect(delay).connect(fb).connect(delay);
    delay.connect(lout);
  }

  setVolume(v: number): void {
    this.bus.gain.value = v;
  }

  /** Starts (or keeps) a song; intensity decides what is audible. */
  play(id: keyof typeof SONGS | string): void {
    if (this.songId === id && this.timer) return;
    this.stopScheduler();
    this.song = SONGS[id] ?? SONGS.hellfront;
    this.songId = id;
    this.step = 0;
    this.sectionIdx = 0;
    this.barInSection = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.startPad();
  }

  setIntensity(i: MusicIntensity, fade = 1.6): void {
    if (i === this.intensity) return;
    this.intensity = i;
    const t = this.ctx.currentTime;
    const ramp = (g: GainNode, v: number) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(v, t + fade);
    };
    ramp(this.band, i === 'combat' ? 1 : 0);
    ramp(this.padGain, i === 'calm' ? 0.5 : i === 'combat' ? 0.12 : 0);
    if (i === 'combat') {
      // restart the song from a section start so the drop lands on a downbeat
      this.step = 0;
      this.barInSection = 0;
    }
  }

  stop(fade = 1): void {
    this.setIntensity('off', fade);
    window.setTimeout(() => {
      if (this.intensity === 'off') {
        this.stopScheduler();
        this.pad?.stop();
        this.pad = null;
        this.songId = '';
      }
    }, fade * 1000 + 50);
  }

  private stopScheduler(): void {
    clearInterval(this.timer);
    this.timer = 0;
  }

  private schedule(): void {
    const song = this.song;
    if (!song || this.ctx.state !== 'running') return;
    const stepDur = 60 / song.bpm / 4;
    // keep the clock but skip note generation while the band is silent
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      if (this.intensity === 'combat' || this.band.gain.value > 0.01) this.playStep(song, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.barInSection++;
        const sec = song.sections[song.order[this.sectionIdx % song.order.length]];
        if (this.barInSection >= sec.bars) {
          this.barInSection = 0;
          this.sectionIdx = (this.sectionIdx + 1) % song.order.length;
        }
      }
    }
  }

  private playStep(song: Song, t: number, sd: number): void {
    const sec = song.sections[song.order[this.sectionIdx % song.order.length]];
    const s = this.step;
    if (s === 0 && this.barInSection === 0 && sec.crashOnStart) this.cymbal(t, 1.4, 0.22);
    if (sec.kick[s] === 'K') this.kick(t);
    if (sec.snare[s] === 'S') this.snare(t);
    if (sec.hat[s] === 'h') this.cymbal(t, 0.05, 0.07);
    if (sec.hat[s] === 'c') this.cymbal(t, 0.5, 0.12);
    const bar = sec.riff[this.barInSection % sec.riff.length];
    const st = bar[s];
    if (st) {
      const f = song.root * Math.pow(2, st.semi / 12);
      this.guitar(t, f, st.len * sd, st.open);
      this.bass(t, f / 2, st.len * sd * 0.95);
    }
    if (sec.lead) {
      const n = sec.lead[s];
      if (n >= 0) this.leadNote(t, song.root * 2 * Math.pow(2, n / 12), sd * 0.9);
    }
  }

  private guitar(t: number, f: number, dur: number, open: boolean): void {
    const c = this.ctx;
    const g = c.createGain();
    const len = open ? Math.max(dur, 0.12) : Math.min(dur, 0.11);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.004);
    g.gain.setValueAtTime(1, t + len * 0.8);
    g.gain.linearRampToValueAtTime(0, t + len + 0.03);
    g.connect(open ? this.gtrOpen : this.gtrMute);
    // power chord: root + fifth (+ octave when open), two slightly detuned saws per voice
    const voices = open ? [1, 1.4983, 2] : [1, 1.4983];
    for (const r of voices) {
      for (const det of [-7, 6]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f * r;
        o.detune.value = det;
        o.connect(g);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  }

  private bass(t: number, f: number, dur: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.005);
    g.gain.setValueAtTime(0.16, t + Math.max(0.02, dur - 0.02));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    o.connect(lp).connect(g).connect(this.band);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private leadNote(t: number, f: number, dur: number): void {
    const c = this.ctx;
    for (const det of [-9, 9]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.01, t + dur);
      o.connect(g).connect(this.leadIn);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }

  private kick(t: number): void {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const g = c.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(this.band);
    o.start(t);
    o.stop(t + 0.25);
    // beater click
    this.noiseHit(t, 0.012, 'highpass', 2500, 0.25);
  }

  private snare(t: number): void {
    this.noiseHit(t, 0.17, 'bandpass', 1900, 0.55);
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g).connect(this.band);
    o.start(t);
    o.stop(t + 0.12);
  }

  private cymbal(t: number, dur: number, vol: number): void {
    this.noiseHit(t, dur, 'highpass', 7000, vol);
  }

  private noiseHit(t: number, dur: number, type: BiquadFilterType, freq: number, vol: number): void {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.band);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Dark drone in the song's key: detuned saws, slow filter sweep. */
  private startPad(): void {
    if (this.pad || !this.song) return;
    const c = this.ctx;
    const root = this.song.root / 2;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lp.Q.value = 3;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = c.createGain();
    lfoG.gain.value = 220;
    lfo.connect(lfoG).connect(lp.frequency);
    const g = c.createGain();
    g.gain.value = 0.18;
    lp.connect(g).connect(this.padGain);
    const oscs: OscillatorNode[] = [lfo];
    for (const [r, det] of [[1, -8], [1, 8], [1.4983, 0], [2, -4], [2.3784, 5]] as [number, number][]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = root * r;
      o.detune.value = det;
      o.connect(lp);
      oscs.push(o);
    }
    oscs.forEach((o) => o.start());
    this.pad = {
      stop: () => oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* ignore */
        }
      }),
    };
  }
}
