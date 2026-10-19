import { t } from '../core/i18n';
import { button, h, MenuNav, type UISound } from './dom';

export interface DeathCallbacks {
  onRespawn(): void;
  onRestart(): void;
  onQuit(): void;
}

export class DeathScreen {
  readonly el = h('div', { class: 'screen overlay', id: 'death' });
  nav!: MenuNav;
  private flavor: string | null = null;
  private final = false;

  constructor(private cb: DeathCallbacks, private sound: (s: UISound) => void) {
    this.render();
  }

  render(): void {
    this.el.innerHTML = '';
    this.el.append(h('div', { class: 'died', text: t('death.title') }));
    this.el.append(h('div', { class: 'death-flavor', text: this.flavor ?? t('death.flavor') }));
    const box = h('div', { class: 'death-box plate' });
    const s = this.sound;
    const items = this.final
      ? [button(t('death.quit'), () => this.cb.onQuit(), s)]
      : [
          button(t('death.respawn'), () => this.cb.onRespawn(), s),
          button(t('death.restart'), () => this.cb.onRestart(), s),
          button(t('death.quit'), () => this.cb.onQuit(), s),
        ];
    box.append(...items);
    this.el.append(box);
    this.nav = new MenuNav(items, s, null);
  }

  show(flavor: string | null = null, final = false): void {
    this.flavor = flavor;
    this.final = final;
    this.render();
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }
}
