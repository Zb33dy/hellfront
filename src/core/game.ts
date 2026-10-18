import type { Engine } from '@babylonjs/core';
import { createEngine, applyRenderScale } from './engine';
import { Input } from './input';
import { SettingsStore, type Settings } from './settingsStore';
import { GameClock } from './time';
import { SaveStore, type SaveData } from './save';
import { getLang, setLang, t } from './i18n';
import { nextFrame } from './util';
import type { Difficulty } from './config';
import { AudioManager } from '../audio/audioManager';
import { VOICE_LINES, lineText } from '../audio/subtitles';
import { UIManager } from '../ui/uiManager';
import type { UISound } from '../ui/dom';
import { MenuScene } from '../scenes/menuScene';
import { LevelScene as LevelScene } from '../scenes/levelScene';
import { LEVEL01 } from '../level/level01.data';
import { getLevel, LEVEL_ORDER } from '../level/levels';
import type { PlayerState } from '../entities/player';
import type { LevelStats } from '../ui/levelComplete';

export type GameState = 'boot' | 'bootReady' | 'menu' | 'loading' | 'ready' | 'playing' | 'paused' | 'dead' | 'complete' | 'chapter';

/** Top-level state machine: boot → menu → loading → playing ⇄ paused → dead / complete → chapter end. */
export class Game {
  readonly engine: Engine;
  readonly settings = new SettingsStore();
  readonly input: Input;
  readonly audio = new AudioManager();
  readonly ui: UIManager;
  readonly clock = new GameClock();
  state: GameState = 'boot';
  menuScene: MenuScene | null = null;
  level: LevelScene | null = null;
  difficulty: Difficulty = 'normal';
  levelId = 'level01';
  /** Player state carried into the current level (re-used on restart). */
  private carry: PlayerState | null = null;
  private nextCarry: PlayerState | null = null;
  /** Lets automated tests run gameplay without pointer lock. */
  allowUnlocked = false;
  private loadedFromSave = false;
  private settingsReturn: 'menu' | 'pause' = 'menu';

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    this.engine = createEngine(canvas);
    this.input = new Input(canvas, this.settings);
    setLang(this.settings.data.language);
    const sound = (s: UISound) => this.audio.play(s);
    this.ui = new UIManager(root, this.settings, sound, {
      onNewGame: (d, id) => this.startLevel(id, d, null, null),
      chapters: () => LEVEL_ORDER.map((l) => ({ id: l.id, label: `${t('chapter.n', { n: l.chapter })} — ${t(l.titleKey)}` })),
      onContinue: () => {
        const s = SaveStore.load();
        if (s) this.startLevel(s.level, s.difficulty, s, null);
      },
      onSettings: () => this.openSettings('menu'),
      hasSave: () => SaveStore.has(),
      pause: {
        onResume: () => this.resume(),
        onSettings: () => this.openSettings('pause'),
        onRestart: () => this.startLevel(this.levelId, this.difficulty, null, this.carry),
        onQuit: () => this.quitToMenu(),
      },
      death: {
        onRespawn: () => {
          const s = SaveStore.load();
          this.startLevel(this.levelId, this.difficulty, s && s.difficulty === this.difficulty && s.level === this.levelId ? s : null, this.carry);
        },
        onRestart: () => this.startLevel(this.levelId, this.difficulty, null, this.carry),
        onQuit: () => this.quitToMenu(),
      },
      onCompleteContinue: () => {
        this.ui.complete.hide();
        const data = getLevel(this.levelId);
        const next = getLevel(data?.next);
        const title = next ? t('chapter.end', { n: data?.chapter ?? 1 }) : t('ending.title');
        this.ui.chapter.show(title, t(data?.outroKey ?? 'ch1.outro'), !!next);
        this.state = 'chapter';
      },
      onChapterMenu: () => this.quitToMenu(),
      onChapterNext: () => {
        const next = getLevel(getLevel(this.levelId)?.next);
        if (next) this.startLevel(next.id, this.difficulty, null, this.nextCarry);
      },
      onLoadingConfirm: () => this.confirmLoading(),
    });
    this.input.onLockLost = () => {
      if (this.state === 'playing') this.pause();
    };
    this.ui.hud.clickEl.addEventListener('click', () => void this.lock());
    canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.locked) void this.lock();
    });
    window.addEventListener('keydown', (e) => {
      // Esc without pointer lock (lock is lost by the browser itself otherwise)
      if (e.code === this.settings.data.bindings.pause && this.state === 'playing' && !this.input.locked) this.pause();
    });
    this.settings.onChange((s) => this.applySettings(s));
    window.addEventListener('resize', () => this.applySettings(this.settings.data));
    this.applySettings(this.settings.data);
    this.engine.runRenderLoop(() => this.frame());
  }

  private applySettings(s: Settings): void {
    this.audio.setVolumes(s.master, s.sfx, s.voice);
    applyRenderScale(this.engine, s.renderScale);
    if (getLang() !== s.language) {
      setLang(s.language);
      this.ui.relabel();
    }
    this.level?.applySettings(s);
    this.menuScene?.applySettings(s);
  }

  async boot(): Promise<void> {
    this.ui.loading.show();
    this.ui.loading.progress(0.05, 'AUDIO');
    await nextFrame();
    await this.audio.load((p) => this.ui.loading.progress(0.05 + p * 0.6, 'AUDIO'));
    this.ui.loading.progress(0.7, 'HANGAR');
    await nextFrame();
    this.menuScene = new MenuScene(this.engine, LEVEL01, this.settings.data);
    await nextFrame();
    this.state = 'bootReady';
    this.ui.loading.ready();
  }

  private confirmLoading(): void {
    if (this.state === 'bootReady') {
      void this.audio.ctx.resume();
      this.ui.loading.hide();
      this.showMenu();
    } else if (this.state === 'ready' && this.level) {
      void this.audio.ctx.resume();
      this.ui.loading.hide();
      this.ui.hud.show();
      this.ui.hud.clickEl.textContent = t('hud.clickToPlay');
      this.ui.navEnabled = false;
      this.level.begin(this.loadedFromSave);
      this.state = 'playing';
      void this.lock();
    }
  }

  private async lock(): Promise<void> {
    const ok = await this.input.requestLock();
    this.ui.hud.clickEl.classList.toggle('show', !ok && !this.allowUnlocked);
  }

  showMenu(): void {
    this.ui.hideAll();
    this.ui.hud.hide();
    this.ui.subtitles.clear();
    this.ui.navEnabled = true;
    if (!this.menuScene) this.menuScene = new MenuScene(this.engine, LEVEL01, this.settings.data);
    this.ui.menu.show();
    this.state = 'menu';
    this.audio.muffle(false);
  }

  private openSettings(from: 'menu' | 'pause'): void {
    this.settingsReturn = from;
    this.ui.settings.show(() => {
      if (this.settingsReturn === 'pause') this.ui.pause.show();
    });
  }

  async startLevel(levelId: string, difficulty: Difficulty, save: SaveData | null, carry: PlayerState | null): Promise<void> {
    if (this.state === 'loading') return;
    const data = getLevel(levelId) ?? LEVEL01;
    this.state = 'loading';
    this.difficulty = difficulty;
    this.levelId = data.id;
    this.carry = carry;
    this.loadedFromSave = !!save;
    this.input.releaseLock();
    this.ui.hideAll();
    this.ui.hud.hide();
    this.ui.hud.reset();
    this.ui.subtitles.clear();
    this.audio.stopVoice();
    this.audio.muffle(false);
    this.ui.loading.show({ title: `${t('chapter.n', { n: data.chapter })} — ${t(data.titleKey)}`, body: t(data.introKey) });
    await nextFrame();
    this.level?.dispose();
    this.level = null;
    this.menuScene?.dispose();
    this.menuScene = null;
    const progress = async (p: number, label: string) => {
      this.ui.loading.progress(p, label);
      await nextFrame();
    };
    this.level = await LevelScene.create(this.engine, data, difficulty, this.audio, this.ui, () => this.settings.data, {
      onDeath: () => this.onDeath(),
      onComplete: (s) => this.onComplete(s),
      onCheckpoint: (s) => SaveStore.save(s),
      voice: (id) => this.voice(id),
    }, save, progress, carry);
    this.ui.loading.ready();
    this.state = 'ready';
  }

  voice(id: string): void {
    const line = VOICE_LINES.find((l) => l.id === id);
    if (!line) return;
    const dur = this.audio.playVoice(line);
    if (this.settings.data.subtitles) this.ui.subtitles.show(t('subs.speaker'), lineText(line, getLang()), dur);
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.navEnabled = true;
    this.ui.hud.clickEl.classList.remove('show');
    this.ui.pause.show();
    this.audio.muffle(true);
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.ui.settings.hide();
    this.ui.pause.hide();
    this.ui.navEnabled = false;
    this.audio.muffle(false);
    this.state = 'playing';
    void this.lock();
  }

  private onDeath(): void {
    this.state = 'dead';
    this.input.releaseLock();
    this.ui.navEnabled = true;
    this.ui.death.show();
    this.audio.muffle(true);
  }

  private onComplete(stats: LevelStats): void {
    this.state = 'complete';
    this.input.releaseLock();
    SaveStore.clear();
    this.nextCarry = this.level ? this.level.player.state : null;
    const data = getLevel(this.levelId);
    const title = `${t(data?.titleKey ?? 'ch1.title')} — ${t('complete.cleared')}`;
    setTimeout(() => {
      this.ui.navEnabled = true;
      this.ui.hud.hide();
      this.ui.complete.show(stats, title);
    }, 1400);
  }

  quitToMenu(): void {
    this.input.releaseLock();
    this.level?.dispose();
    this.level = null;
    this.audio.stopVoice();
    this.showMenu();
  }

  private frame(): void {
    const dt = this.clock.tick(this.engine.getDeltaTime() / 1000);
    switch (this.state) {
      case 'menu':
      case 'bootReady':
        if (this.menuScene) {
          this.menuScene.update(dt);
          this.menuScene.render();
        }
        break;
      case 'playing':
        if (this.level) {
          if (this.input.locked || this.allowUnlocked) {
            this.ui.hud.clickEl.classList.remove('show');
            this.level.update(dt, this.input);
          } else {
            this.ui.hud.clickEl.classList.add('show');
          }
          this.level.render();
        }
        break;
      case 'paused':
      case 'dead':
      case 'complete':
        if (this.level) {
          this.level.idle(dt);
          this.level.render();
        }
        break;
      case 'chapter':
        if (this.level) this.level.render();
        break;
      default:
        break;
    }
    this.input.endFrame();
  }

  /** Debug/automation helpers (window.__hf). */
  get debug() {
    return {
      level: () => this.level,
      teleport: (cx: number, cy: number) => this.level?.debugTeleport(cx, cy),
      giveAll: () => this.level?.debugGiveAll(),
      key: (code: string, down: boolean) => this.input.simulate(code, down),
      look: (yawDeg: number, pitchDeg = 0) => {
        if (!this.level) return;
        this.level.player.yaw = (yawDeg * Math.PI) / 180;
        this.level.player.pitch = (pitchDeg * Math.PI) / 180;
      },
      fire: (down: boolean) => {
        this.input.mouseDown = down;
      },
    };
  }
}
