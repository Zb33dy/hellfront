import { t } from '../core/i18n';
import { button, h, MenuNav, type UISound } from './dom';

export interface PauseCallbacks {
  onResume(): void;
  onSettings(): void;
  onRestart(): void;
  onQuit(): void;
}

export class PauseScreen {
  readonly el = h('div', { class: 'screen overlay', id: 'pause' });
  nav!: MenuNav;

  constructor(private cb: PauseCallbacks, private sound: (s: UISound) => void) {
    this.render();
  }

  render(): void {
    this.el.innerHTML = '';
    const bar = h('div', { class: 'hazard-bar' });
    bar.style.cssText = 'position:absolute;left:0;right:0;top:0';
    const box = h('div', { class: 'pause-box plate' });
    box.append(h('div', { class: 'panel-title', text: t('pause.title') }));
    const s = this.sound;
    const items = [
      button(t('pause.resume'), () => this.cb.onResume(), s),
      button(t('menu.settings'), () => this.cb.onSettings(), s),
      button(t('pause.restart'), () => this.cb.onRestart(), s),
      button(t('pause.quit'), () => this.cb.onQuit(), s),
    ];
    box.append(...items);
    box.append(h('div', { class: 'pause-hint', text: t('pause.lockHint') }));
    this.el.append(bar, box);
    this.nav = new MenuNav(items, s, () => this.cb.onResume());
  }

  show(): void {
    this.nav.focus(0, true);
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }
}
