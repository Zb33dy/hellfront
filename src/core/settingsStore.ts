import type { Lang } from './i18n';

export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'use'
  | 'weapon1' | 'weapon2' | 'weapon3' | 'weapon4' | 'lastWeapon' | 'grenade' | 'focus' | 'pause';

export const ACTIONS: Action[] = ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'use', 'weapon1', 'weapon2', 'weapon3', 'weapon4', 'lastWeapon', 'grenade', 'focus', 'pause'];

export const DEFAULT_BINDINGS: Record<Action, string> = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  use: 'KeyE',
  weapon1: 'Digit1',
  weapon2: 'Digit2',
  weapon3: 'Digit3',
  weapon4: 'Digit4',
  lastWeapon: 'KeyZ',
  grenade: 'KeyG',
  focus: 'KeyQ',
  pause: 'Escape',
};

export interface Settings {
  master: number;
  sfx: number;
  voice: number;
  sensitivity: number;
  invertY: boolean;
  fov: number;
  renderScale: 1 | 2 | 3; // hardware scaling divisor: 100% / 50% / 33%
  bloom: boolean;
  grain: boolean;
  retroLight: boolean;
  subtitles: boolean;
  language: Lang;
  bindings: Record<Action, string>;
}

const KEY = 'hellfront.settings.v1';

export function defaultSettings(): Settings {
  return {
    master: 0.8,
    sfx: 0.8,
    voice: 0.9,
    sensitivity: 1.0,
    invertY: false,
    fov: 90,
    renderScale: 1,
    bloom: true,
    grain: true,
    retroLight: true,
    subtitles: true,
    language: navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en',
    bindings: { ...DEFAULT_BINDINGS },
  };
}

export class SettingsStore {
  data: Settings;
  private listeners = new Set<(s: Settings) => void>();

  constructor() {
    this.data = defaultSettings();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        this.data = { ...this.data, ...parsed, bindings: { ...DEFAULT_BINDINGS, ...(parsed.bindings ?? {}) } };
      }
    } catch {
      /* storage unavailable: keep defaults */
    }
  }

  update(patch: Partial<Settings>): void {
    this.data = { ...this.data, ...patch };
    this.save();
    this.listeners.forEach((f) => f(this.data));
  }

  reset(): void {
    const lang = this.data.language;
    this.data = { ...defaultSettings(), language: lang };
    this.save();
    this.listeners.forEach((f) => f(this.data));
  }

  onChange(f: (s: Settings) => void): void {
    this.listeners.add(f);
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
    AltLeft: 'L-ALT', AltRight: 'R-ALT', Escape: 'ESC', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Tab: 'TAB', Enter: 'ENTER', CapsLock: 'CAPS',
  };
  return map[code] ?? code.toUpperCase();
}
