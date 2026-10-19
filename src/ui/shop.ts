import { t } from '../core/i18n';
import type { ShopItem } from '../scenes/siege';
import { button, h, MenuNav, type UISound } from './dom';

export interface ShopProvider {
  souls(): number;
  items(): ShopItem[];
  buy(id: string): boolean;
}

/** Siege intermission shop: spend souls on run upgrades and refills. */
export class ShopScreen {
  readonly el = h('div', { class: 'screen overlay', id: 'shop' });
  nav: MenuNav | null = null;
  private provider: ShopProvider | null = null;

  constructor(private sound: (s: UISound) => void, private onClose: () => void) {}

  show(provider: ShopProvider): void {
    this.provider = provider;
    this.render(0);
    this.el.classList.add('show');
  }

  private render(focus: number): void {
    const pr = this.provider!;
    this.el.innerHTML = '';
    const box = h('div', { class: 'shop-box plate' });
    box.append(h('div', { class: 'panel-title', text: t('shop.title') }));
    box.append(h('div', { class: 'shop-souls', text: `${t('siege.souls')}: ${pr.souls()}` }));
    const btns: HTMLButtonElement[] = [];
    pr.items().forEach((it, i) => {
      const lvl = it.level !== undefined ? ` [${it.level}]` : '';
      const label = `${it.name}${lvl} — ${it.maxed ? t('shop.max') : it.cost}`;
      const b = button(label, () => {
        if (pr.buy(it.id)) this.render(i);
        else this.sound('ui_back');
      }, this.sound, it.desc);
      if (it.maxed || pr.souls() < it.cost) b.classList.add('disabled');
      btns.push(b);
    });
    const close = button(t('shop.close'), () => this.onClose(), this.sound);
    btns.push(close);
    const grid = h('div', { class: 'shop-grid' });
    grid.append(...btns.slice(0, -1));
    box.append(grid, close);
    this.el.append(box);
    this.nav = new MenuNav(btns, this.sound, () => this.onClose());
    this.nav.focus(Math.min(focus, btns.length - 1), true);
  }

  hide(): void {
    this.el.classList.remove('show');
  }
}
