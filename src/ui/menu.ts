import type { Difficulty } from '../core/config';
import { t } from '../core/i18n';
import { button, h, MenuNav, type UISound } from './dom';

export interface MenuCallbacks {
  onNewGame(d: Difficulty, levelId: string): void;
  /** Siege lobby: pick the starting round, then difficulty. */
  onSiege(): void;
  /** Daily Siege: today's seeded run. */
  onDaily(): void;
  /** Achievements & cosmetics list. */
  onAchievements(): void;
  /** Extra modes (tutorial, gallery, battle test). */
  onMode(id: string): void;
  /** Chapter select entries. */
  chapters(): { id: string; label: string }[];
  onContinue(): void;
  onSettings(): void;
  hasSave(): boolean;
}

export function logo(): HTMLElement {
  const wrap = h('div');
  wrap.append(h('div', { class: 'logo', text: 'HELLFRONT', attrs: { 'data-text': 'HELLFRONT' } }));
  return wrap;
}

/** Main menu with difficulty, credits and quit sub-panels. */
export class MenuScreen {
  readonly el = h('div', { class: 'screen', id: 'menu' });
  nav!: MenuNav;
  private sub: 'none' | 'difficulty' | 'chapters' | 'modes' | 'credits' | 'quit' = 'none';
  private modesNav!: MenuNav;
  private chapNav!: MenuNav;
  private pendingLevel = 'level01';
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
      button(t('menu.new'), () => {
        this.pendingLevel = 'level01';
        this.open('difficulty');
      }, s),
      (this.continueBtn = button(t('menu.continue'), () => this.cb.onContinue(), s)),
      button(t('menu.chapters'), () => this.open('chapters'), s),
      button(t('menu.siege'), () => this.cb.onSiege(), s),
      button(t('menu.daily'), () => this.cb.onDaily(), s),
      button(t('menu.modes'), () => this.open('modes'), s),
      button(t('menu.achievements'), () => this.cb.onAchievements(), s),
      button(t('menu.settings'), () => this.cb.onSettings(), s),
      button(t('menu.credits'), () => this.open('credits'), s),
      button(t('menu.quit'), () => this.open('quit'), s),
    ];
    list.append(...items);
    left.append(list);
    this.el.append(left);
    this.mainNav = new MenuNav(items, s, null);

    // difficulty
    const dp = h('div', { class: 'sub-panel plate' });
    dp.append(h('div', { class: 'panel-title', text: t('menu.difficulty') }));
    const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'ultra', 'turbo'];
    const dItems = diffs.map((d) => button(t(`diff.${d}`), () => this.cb.onNewGame(d, this.pendingLevel), s, t(`diff.${d}.d`)));
    const dBack = button(t('common.back'), () => this.open('none'), s);
    dp.append(...dItems, dBack);
    this.diffNav = new MenuNav([...dItems, dBack], s, () => this.open('none'));
    this.diffNav.focus(1, true);
    this.panels.difficulty = dp;

    // chapter select
    const chp = h('div', { class: 'sub-panel plate' });
    chp.append(h('div', { class: 'panel-title', text: t('menu.chapters') }));
    const cItems = this.cb.chapters().map((c) => button(c.label, () => {
      this.pendingLevel = c.id;
      this.open('difficulty');
    }, s));
    const chBack = button(t('common.back'), () => this.open('none'), s);
    chp.append(...cItems, chBack);
    this.chapNav = new MenuNav([...cItems, chBack], s, () => this.open('none'));
    this.panels.chapters = chp;

    // extra modes
    const mp = h('div', { class: 'sub-panel plate' });
    mp.append(h('div', { class: 'panel-title', text: t('menu.modes') }));
    const mItems = ['tutorial', 'gallery', 'battle'].map((id) => button(t('mode.' + id), () => this.cb.onMode(id), s, t('mode.' + id + '.d')));
    const mBack = button(t('common.back'), () => this.open('none'), s);
    mp.append(...mItems, mBack);
    this.modesNav = new MenuNav([...mItems, mBack], s, () => this.open('none'));
    this.panels.modes = mp;

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

    this.el.append(dp, chp, mp, cp, qp);
    this.refresh();
    this.open(this.sub, true);
  }

  refresh(): void {
    this.continueBtn.classList.toggle('disabled', !this.cb.hasSave());
  }

  /** Opens the difficulty panel for a given level (Siege lobby). */
  pickDifficulty(levelId: string): void {
    this.pendingLevel = levelId;
    this.open('difficulty');
  }

  open(which: 'none' | 'difficulty' | 'chapters' | 'modes' | 'credits' | 'quit', silent = false): void {
    this.sub = which;
    this.el.classList.toggle('sub-open', which !== 'none');
    for (const [k, p] of Object.entries(this.panels)) p.classList.toggle('show', k === which);
    this.nav = which === 'difficulty' ? this.diffNav : which === 'chapters' ? this.chapNav : which === 'modes' ? this.modesNav : which === 'credits' ? this.creditsNav : which === 'quit' ? this.quitNav : this.mainNav;
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
