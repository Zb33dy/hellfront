import type { Difficulty } from '../core/config';
import { t } from '../core/i18n';
import { button, h, MenuNav, type UISound } from './dom';

export interface MenuCallbacks {
  onNewGame(d: Difficulty): void;
  onContinue(): void;
  onSettings(): void;
  hasSave(): boolean;
}

export function logo(): HTMLElement {
  const wrap = h('div');
  wrap.append(h('div', { class: 'logo', text: 'HELLFRONT', attrs: { 'data-text': 'HELLFRONT' } }));
  wrap.append(h('div', { class: 'logo-sub', text: t('menu.subtitle') }));
  return wrap;
}

/** Main menu with difficulty, credits and quit sub-panels. */
export class MenuScreen {
  readonly el = h('div', { class: 'screen', id: 'menu' });
  nav!: MenuNav;
  private sub: 'none' | 'difficulty' | 'credits' | 'quit' = 'none';
  private mainNav!: MenuNav;
  private diffNav!: MenuNav;
  private creditsNav!: MenuNav;
  private quitNav!: MenuNav;
  private panels: Record<string, HTMLElement> = {};
  private continueBtn!: HTMLButtonElement;

  constructor(private cb: MenuCallbacks, private sound: (s: UISound) => void) {
    this.render();
  }

  render(): void {
    this.el.innerHTML = '';
    this.el.append(h('div', { class: 'menu-embers' }));
    const left = h('div', { class: 'menu-left' });
    left.append(logo());
    const list = h('div', { class: 'menu-list' });
    const s = this.sound;
    const items = [
      button(t('menu.new'), () => this.open('difficulty'), s),
      (this.continueBtn = button(t('menu.continue'), () => this.cb.onContinue(), s)),
      button(t('menu.settings'), () => this.cb.onSettings(), s),
      button(t('menu.credits'), () => this.open('credits'), s),
      button(t('menu.quit'), () => this.open('quit'), s),
    ];
    list.append(...items);
    left.append(list);
    left.append(h('div', { class: 'menu-foot', html: 'v0.1 · WASD + MOUSE · ESC PAUSE<br>© HELLFRONT TEAM — ORIGINAL ASSETS' }));
    this.el.append(left);
    this.mainNav = new MenuNav(items, s, null);

    // difficulty
    const dp = h('div', { class: 'sub-panel plate' });
    dp.append(h('div', { class: 'panel-title', text: t('menu.difficulty') }));
    const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
    const dItems = diffs.map((d) => button(t(`diff.${d}`), () => this.cb.onNewGame(d), s, t(`diff.${d}.d`)));
    const dBack = button(t('common.back'), () => this.open('none'), s);
    dp.append(...dItems, dBack);
    this.diffNav = new MenuNav([...dItems, dBack], s, () => this.open('none'));
    this.diffNav.focus(1, true);
    this.panels.difficulty = dp;

    // credits
    const cp = h('div', { class: 'sub-panel plate' });
    cp.append(h('div', { class: 'panel-title', text: t('credits.title') }));
    cp.append(h('div', { class: 'credits-body', html: t('credits.body') }));
    const cBack = button(t('common.back'), () => this.open('none'), s);
    cBack.style.marginTop = '18px';
    cp.append(cBack);
    this.creditsNav = new MenuNav([cBack], s, () => this.open('none'));
    this.panels.credits = cp;

    // quit
    const qp = h('div', { class: 'sub-panel plate quit-box' });
    qp.append(h('div', { class: 'panel-title', text: t('quit.title') }));
    qp.append(h('p', { text: t('quit.body') }));
    const qBack = button(t('quit.return'), () => this.open('none'), s);
    qp.append(qBack);
    this.quitNav = new MenuNav([qBack], s, () => this.open('none'));
    this.panels.quit = qp;

    this.el.append(dp, cp, qp);
    this.refresh();
    this.open(this.sub, true);
  }

  refresh(): void {
    this.continueBtn.classList.toggle('disabled', !this.cb.hasSave());
  }

  open(which: 'none' | 'difficulty' | 'credits' | 'quit', silent = false): void {
    this.sub = which;
    for (const [k, p] of Object.entries(this.panels)) p.classList.toggle('show', k === which);
    this.nav = which === 'difficulty' ? this.diffNav : which === 'credits' ? this.creditsNav : which === 'quit' ? this.quitNav : this.mainNav;
    if (which === 'quit' && !silent) {
      // Browsers only allow closing tabs opened by script; show the message either way.
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }
  }

  show(): void {
    this.refresh();
    this.open('none', true);
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }
}
