import { t } from '../core/i18n';
import { button, h, MenuNav, type UISound } from './dom';

export interface ChoiceOption {
  id: string;
  label: string;
  desc?: string;
  disabled?: boolean;
}

/** Generic pick-one overlay (ability select, Battle Test spawn menu, Siege round select). */
export class ChoiceScreen {
  readonly el = h('div', { class: 'screen overlay', id: 'choice' });
  nav: MenuNav | null = null;
  private onPick: ((id: string) => void) | null = null;
  private onCancel: (() => void) | null = null;

  constructor(private sound: (s: UISound) => void) {}

  show(title: string, options: ChoiceOption[], onPick: (id: string) => void, onCancel: (() => void) | null = null, columns = 2): void {
    this.onPick = onPick;
    this.onCancel = onCancel;
    this.el.innerHTML = '';
    const box = h('div', { class: 'choice-box plate' });
    box.append(h('div', { class: 'panel-title', text: title }));
    const grid = h('div', { class: 'choice-grid' });
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    const btns = options.map((o) => {
      const b = button(o.label, () => this.onPick?.(o.id), this.sound, o.desc);
      if (o.disabled) b.classList.add('disabled');
      return b;
    });
    grid.append(...btns);
    box.append(grid);
    const all = [...btns];
    if (onCancel) {
      const back = button(t('common.back'), () => this.onCancel?.(), this.sound);
      box.append(back);
      all.push(back);
    }
    this.el.append(box);
    this.nav = new MenuNav(all, this.sound, onCancel ? () => this.onCancel?.() : null);
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }

  get visible(): boolean {
    return this.el.classList.contains('show');
  }
}
