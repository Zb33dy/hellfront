export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; id?: string; html?: string; text?: string; attrs?: Record<string, string> } = {},
  children: (HTMLElement | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.id) el.id = props.id;
  if (props.html !== undefined) el.innerHTML = props.html;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  for (const c of children) el.append(c);
  return el;
}

export type UISound = 'ui_hover' | 'ui_click' | 'ui_back';

/** Keyboard + mouse navigation over a vertical list of focusable items. */
export class MenuNav {
  index = 0;
  constructor(
    public items: HTMLElement[],
    private sound: (s: UISound) => void,
    public onBack: (() => void) | null = null,
    /** Left/right adjust for settings rows. */
    public onAdjust: ((item: HTMLElement, dir: number) => void) | null = null,
  ) {
    items.forEach((el, i) => {
      el.addEventListener('mouseenter', () => this.focus(i));
    });
    this.focus(0, true);
  }

  setItems(items: HTMLElement[]): void {
    this.items = items;
    items.forEach((el, i) => el.addEventListener('mouseenter', () => this.focus(i)));
    this.focus(Math.min(this.index, items.length - 1), true);
  }

  focus(i: number, silent = false): void {
    if (!this.items.length) return;
    i = (i + this.items.length) % this.items.length;
    if (i !== this.index && !silent) this.sound('ui_hover');
    this.items.forEach((el) => el.classList.remove('focus'));
    this.index = i;
    this.items[i].classList.add('focus');
    this.items[i].scrollIntoView?.({ block: 'nearest' });
  }

  handleKey(e: KeyboardEvent): boolean {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.focus(this.index - 1);
        return true;
      case 'ArrowDown':
      case 'KeyS':
        this.focus(this.index + 1);
        return true;
      case 'ArrowLeft':
      case 'KeyA':
        if (this.onAdjust) this.onAdjust(this.items[this.index], -1);
        return true;
      case 'ArrowRight':
      case 'KeyD':
        if (this.onAdjust) this.onAdjust(this.items[this.index], 1);
        return true;
      case 'Enter':
      case 'Space':
      case 'NumpadEnter': {
        const el = this.items[this.index];
        const target = (el.querySelector('.toggle, .choice.sel, .bind') as HTMLElement | null) ?? el;
        target.click();
        return true;
      }
      case 'Escape':
      case 'Backspace':
        if (this.onBack) {
          this.sound('ui_back');
          this.onBack();
          return true;
        }
        return false;
    }
    return false;
  }
}

export function button(label: string, onClick: () => void, sound: (s: UISound) => void, sub?: string): HTMLButtonElement {
  const b = h('button', { class: 'btn' });
  b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
  b.addEventListener('click', () => {
    if (b.classList.contains('disabled')) {
      sound('ui_back');
      return;
    }
    sound('ui_click');
    onClick();
  });
  return b;
}
