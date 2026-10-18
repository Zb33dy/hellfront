import { h } from './dom';

export class DebugOverlay {
  readonly el = h('div', { class: 'debug' });
  visible = false;
  private acc = 0;

  toggle(): void {
    this.visible = !this.visible;
    this.el.classList.toggle('show', this.visible);
  }

  update(dt: number, lines: () => string[]): void {
    if (!this.visible) return;
    this.acc += dt;
    if (this.acc < 0.2) return;
    this.acc = 0;
    this.el.textContent = lines().join('\n');
  }
}
