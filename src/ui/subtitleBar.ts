import { h } from './dom';

export class SubtitleBar {
  readonly el = h('div', { class: 'subtitle-bar' });
  private timer = 0;

  show(speaker: string, text: string, seconds: number): void {
    this.el.innerHTML = '';
    this.el.append(h('b', { text: speaker }), document.createTextNode(text));
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.el.classList.remove('show'), seconds * 1000);
  }

  clear(): void {
    clearTimeout(this.timer);
    this.el.classList.remove('show');
  }
}
