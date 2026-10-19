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
import { SiegeController, siegeBest, siegeStartOptions } from '../scenes/siege';
import { availableFor, unlockAfterChapter, type AbilityId, ABILITY_ORDER } from '../scenes/abilities';
import type { LevelStats } from '../ui/levelComplete';

export type GameState = 'boot' | 'bootReady' | 'menu' | 'loading' | 'ready' | 'playing' | 'paused' | 'shop' | 'choose' | 'dead' | 'complete' | 'chapter';

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
  private newAbility: AbilityId | null = null;
  /** Radio lines waiting for the current one to finish. */
  private voiceQueue: string[] = [];
  private voiceBusyUntil = 0;
  private voiceTimer = 0;

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    this.engine = createEngine(canvas);
    this.input = new Input(canvas, this.settings);
    setLang(this.settings.data.language);
    const sound = (s: UISound) => this.audio.play(s);
    this.ui = new UIManager(root, this.settings, sound, {
      onNewGame: (d, id) => this.startLevel(id, d, null, null),
      onSiege: () => {
        const opts = siegeStartOptions();
        this.ui.choice.show(t('siege.lobby'), opts.map((r) => ({
          id: String(r),
          label: t('siege.startAt', { n: r }),
          desc: r === 1 ? t('siege.fromStart') : r % 15 === 0 ? t('siege.sorcerer') : r % 5 === 0 ? t('siege.hounds') : '',
        })), (id) => {
          SiegeController.startRound = Number(id);
          this.ui.choice.hide();
          this.ui.menu.pickDifficulty('siege');
        }, () => this.ui.choice.hide(), 2);
      },
      onMode: (id) => {
        SiegeController.startRound = 1;
        this.startLevel(id, 'normal', null, null);
      },
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
        const title = data && data.chapter === 0 ? t(data.titleKey) : next ? t('chapter.end', { n: data?.chapter ?? 1 }) : t('ending.title');
        this.state = 'chapter';
        this.audio.music.setIntensity('calm');
        void this.audio.playNarration('n_ch' + (data?.chapter ?? 1)).then((dur) => {
          const unlock = this.newAbility ? `<br><br><b class="unlock">${t('ability.unlocked', { name: t('ability.' + this.newAbility) })}</b>` : '';
          if (this.state === 'chapter') this.ui.chapter.show(title, t(data?.outroKey ?? 'ch1.outro') + unlock, !!next, dur || 6);
        });
      },
      onChapterMenu: () => this.quitToMenu(),
      onChapterNext: () => {
        const next = getLevel(getLevel(this.levelId)?.next);
        if (next) this.startLevel(next.id, this.difficulty, null, this.nextCarry);
      },
      onLoadingConfirm: () => this.confirmLoading(),
      onShopClose: () => this.closeShop(),
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
    this.audio.music.setVolume((s.music ?? 0.6) * 0.8);
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
      // equip an ability: pick one when more than one is available
      const data = this.level.data;
      const special = data.id === 'siege' || data.id === 'tutorial' || data.id === 'gallery' || data.id === 'battle';
      const opts = availableFor(data.chapter, special);
      if (data.id === 'siege') {
        // the siege controller asks at its own start
      } else if (opts.length > 1) this.chooseAbility(opts);
      else {
        this.level.ability.equip('focus');
        void this.lock();
      }
    }
  }

  /** Battle Test sandbox menu: spawn monsters, toggles, abilities. */
  private openBattleMenu(): void {
    const level = this.level;
    if (!level || this.state !== 'playing') return;
    this.state = 'choose';
    this.input.releaseLock();
    this.ui.navEnabled = true;
    const kinds = ['zombieman', 'imp', 'pinky', 'ironclad', 'wraith', 'executioner', 'boltgunner', 'hellflamer', 'terminator', 'warhound', 'warden', 'sovereign', 'sorcerer'];
    const opts = [
      ...kinds.map((k) => ({ id: 'spawn:' + k, label: t('enemy.' + k) })),
      { id: 'god', label: t('battle.god') + (level.godMode ? ' ✓' : '') },
      { id: 'clear', label: t('battle.clear') },
      { id: 'ability', label: t('ability.choose') },
    ];
    const close = () => {
      this.ui.choice.hide();
      this.ui.navEnabled = false;
      this.state = 'playing';
      void this.lock();
    };
    this.ui.choice.show(t('battle.menu'), opts, (id) => {
      if (id.startsWith('spawn:')) level.spawnInFront(id.slice(6) as never);
      else if (id === 'god') level.godMode = !level.godMode;
      else if (id === 'clear') level.killAll();
      else if (id === 'ability') {
        this.ui.choice.hide();
        this.state = 'playing';
        this.chooseAbility([...ABILITY_ORDER]);
        return;
      }
      close();
    }, close, 3);
  }

  /** Pauses on the ability picker; play resumes once one is equipped. */
  chooseAbility(ids: AbilityId[]): void {
    const level = this.level;
    if (!level) return;
    if (this.state !== 'playing') {
      // e.g. the Siege start fires while the level is still finishing its load, or the shop is open
      window.setTimeout(() => this.chooseAbility(ids), 400);
      return;
    }
    const list = ids.length ? ids : ABILITY_ORDER;
    this.state = 'choose';
    this.input.releaseLock();
    this.ui.navEnabled = true;
    this.ui.hud.clickEl.classList.remove('show');
    this.ui.choice.show(
      t('ability.choose'),
      list.map((id) => ({ id, label: (level.ability.id === id ? '▶ ' : '') + t('ability.' + id), desc: t('ability.' + id + '.d') })),
      (id) => {
        level.ability.equip(id as AbilityId);
        this.ui.choice.hide();
        this.ui.navEnabled = false;
        this.state = 'playing';
        void this.lock();
      },
      null,
      1,
    );
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
    this.audio.music.play('hellfront');
    this.audio.music.setIntensity('calm');
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
    this.clearVoices();
    this.audio.muffle(false);
    this.ui.loading.show({ title: data.chapter ? `${t('chapter.n', { n: data.chapter })} — ${t(data.titleKey)}` : t(data.titleKey), body: t(data.introKey) + (data.id === 'siege' ? `<br><br>${t('siege.bestLine', { n: siegeBest() })}` : '') });
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
      openShop: () => this.openShop(),
      chooseAbility: (ids) => this.chooseAbility(ids as AbilityId[]),
      openBattleMenu: () => this.openBattleMenu(),
    }, save, progress, carry);
    this.ui.loading.ready();
    this.state = 'ready';
  }

  voice(id: string): void {
    if (!VOICE_LINES.some((l) => l.id === id)) return;
    const now = performance.now();
    if (now < this.voiceBusyUntil || this.voiceQueue.length) {
      if (!this.voiceQueue.includes(id)) this.voiceQueue.push(id);
      this.scheduleVoice();
      return;
    }
    this.playLine(id);
  }

  private playLine(id: string): void {
    const line = VOICE_LINES.find((l) => l.id === id)!;
    const dur = this.audio.playVoice(line);
    this.voiceBusyUntil = performance.now() + (dur + 0.35) * 1000;
    if (this.settings.data.subtitles) this.ui.subtitles.show(t(line.speaker ?? 'subs.speaker'), lineText(line, getLang()), dur);
    if (this.voiceQueue.length) this.scheduleVoice();
  }

  private scheduleVoice(): void {
    clearTimeout(this.voiceTimer);
    const wait = Math.max(0, this.voiceBusyUntil - performance.now());
    this.voiceTimer = window.setTimeout(() => {
      // paused / menus hold the queue until play resumes
      if (this.state !== 'playing') {
        this.voiceBusyUntil = performance.now() + 500;
        this.scheduleVoice();
        return;
      }
      const next = this.voiceQueue.shift();
      if (next) this.playLine(next);
    }, wait);
  }

  private clearVoices(): void {
    this.audio.stopNarration();
    this.voiceQueue.length = 0;
    clearTimeout(this.voiceTimer);
    this.voiceBusyUntil = 0;
    this.audio.stopVoice();
  }

  private openShop(): void {
    const sg = this.level?.siege;
    if (!sg || this.state !== 'playing') return;
    this.state = 'shop';
    this.input.releaseLock();
    this.ui.navEnabled = true;
    this.ui.hud.clickEl.classList.remove('show');
    this.ui.shop.show({ souls: () => sg.souls, items: () => sg.items(), buy: (id) => sg.buy(id) });
  }

  private closeShop(): void {
    if (this.state !== 'shop') return;
    this.ui.shop.hide();
    this.ui.navEnabled = false;
    this.state = 'playing';
    void this.lock();
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
    const sg = this.level?.siege;
    this.ui.death.show(sg ? t('siege.dead', { n: sg.round, best: Math.max(sg.round, sg.best) }) : null);
    this.audio.muffle(true);
  }

  private onComplete(stats: LevelStats): void {
    this.state = 'complete';
    this.input.releaseLock();
    SaveStore.clear();
    this.nextCarry = this.level ? this.level.player.state : null;
    const data = getLevel(this.levelId);
    const title = `${t(data?.titleKey ?? 'ch1.title')} — ${t('complete.cleared')}`;
    // finishing a chapter unlocks the next ability
    this.newAbility = data && data.chapter >= 1 && data.chapter < 5 && unlockAfterChapter(data.chapter) ? ABILITY_ORDER[data.chapter] : null;
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
    this.clearVoices();
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
      case 'shop':
      case 'choose':
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
