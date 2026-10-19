import { tileDataURL } from '../gfx/textures';
import type { SettingsStore } from '../core/settingsStore';
import type { MenuNav, UISound } from './dom';
import { MenuScreen, type MenuCallbacks } from './menu';
import { SettingsScreen } from './settings';
import { PauseScreen, type PauseCallbacks } from './pause';
import { DeathScreen, type DeathCallbacks } from './deathScreen';
import { ChapterEndScreen, LevelCompleteScreen } from './levelComplete';
import { LoadingScreen } from './loading';
import { ShopScreen } from './shop';
import { ChoiceScreen } from './choice';
import { HUD } from './hud';
import { SubtitleBar } from './subtitleBar';
import { ViewModel } from './viewModel';
import { DebugOverlay } from './debugOverlay';

export interface UICallbacks extends MenuCallbacks {
  pause: PauseCallbacks;
  death: DeathCallbacks;
  onCompleteContinue(): void;
  onChapterMenu(): void;
  onChapterNext(): void;
  onLoadingConfirm(): void;
  onShopClose(): void;
}

/** Owns every DOM screen and routes keyboard navigation to whichever one is on top. */
export class UIManager {
  readonly menu: MenuScreen;
  readonly settings: SettingsScreen;
  readonly pause: PauseScreen;
  readonly death: DeathScreen;
  readonly complete: LevelCompleteScreen;
  readonly chapter: ChapterEndScreen;
  readonly loading: LoadingScreen;
  readonly shop: ShopScreen;
  readonly choice: ChoiceScreen;
  readonly hud: HUD;
  readonly subtitles: SubtitleBar;
  readonly viewModel: ViewModel;
  readonly debug: DebugOverlay;
  navEnabled = true;

  constructor(root: HTMLElement, store: SettingsStore, sound: (s: UISound) => void, cb: UICallbacks) {
    const css = document.documentElement.style;
    css.setProperty('--tex-metal', `url(${tileDataURL('metalPanel', 2)})`);
    css.setProperty('--tex-hazard', `url(${tileDataURL('hazard', 2)})`);
    css.setProperty('--tex-rust', `url(${tileDataURL('rust', 2)})`);

    this.hud = new HUD();
    this.viewModel = new ViewModel();
    this.hud.viewLayer.append(this.viewModel.el);
    this.subtitles = new SubtitleBar();
    this.debug = new DebugOverlay();
    this.menu = new MenuScreen(cb, sound);
    this.settings = new SettingsScreen(store, sound);
    this.pause = new PauseScreen(cb.pause, sound);
    this.death = new DeathScreen(cb.death, sound);
    this.complete = new LevelCompleteScreen(sound, cb.onCompleteContinue);
    this.chapter = new ChapterEndScreen(sound, cb.onChapterMenu, cb.onChapterNext);
    this.loading = new LoadingScreen();
    this.shop = new ShopScreen(sound, cb.onShopClose);
    this.choice = new ChoiceScreen(sound);
    root.append(this.hud.el, this.subtitles.el, this.debug.el, this.menu.el, this.pause.el, this.death.el, this.complete.el, this.chapter.el, this.loading.el, this.settings.el, this.shop.el, this.choice.el);

    window.addEventListener('keydown', (e) => {
      if (this.loading.el.classList.contains('show')) {
        if (this.loading.isReady && !e.repeat) {
          e.preventDefault();
          cb.onLoadingConfirm();
        }
        return;
      }
      if (!this.navEnabled) return;
      if (this.settings.visible) {
        if (this.settings.captureKey(e)) {
          e.preventDefault();
          return;
        }
        if (e.code === 'Tab' || e.code === 'KeyQ' || e.code === 'KeyE') {
          e.preventDefault();
          this.settings.cycleTab(e.code === 'KeyQ' || (e.code === 'Tab' && e.shiftKey) ? -1 : 1);
          return;
        }
      }
      const nav = this.currentNav();
      if (nav && nav.handleKey(e)) e.preventDefault();
    });
    this.loading.el.addEventListener('pointerdown', () => {
      if (this.loading.isReady) cb.onLoadingConfirm();
    });
  }

  currentNav(): MenuNav | null {
    if (this.settings.visible) return this.settings.nav;
    const vis = (el: HTMLElement) => el.classList.contains('show');
    if (vis(this.choice.el)) return this.choice.nav;
    if (vis(this.shop.el)) return this.shop.nav;
    if (vis(this.pause.el)) return this.pause.nav;
    if (vis(this.death.el)) return this.death.nav;
    if (vis(this.complete.el)) return this.complete.nav;
    if (vis(this.chapter.el)) return this.chapter.nav;
    if (vis(this.menu.el)) return this.menu.nav;
    return null;
  }

  hideAll(): void {
    this.menu.hide();
    this.settings.hide();
    this.pause.hide();
    this.death.hide();
    this.complete.hide();
    this.chapter.hide();
    this.shop.hide();
    this.choice.hide();
    this.loading.hide();
  }

  relabel(): void {
    this.menu.render();
    this.pause.render();
    this.death.render();
    this.hud.relabel();
    if (this.settings.visible) this.settings.render();
  }
}
