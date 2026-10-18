import { t, TIP_KEYS } from '../core/i18n';
import { pick } from '../core/util';
import { h } from './dom';
import { logo } from './menu';

export class LoadingScreen {
  readonly el = h('div', { class: 'screen', id: 'loading' });
  private bar!: HTMLElement;
  private label!: HTMLElement;
  private tip!: HTMLElement;
  private press!: HTMLElement;
  private tipTimer = 0;
  isReady = false;

  show(story?: { title: string; body: string }): void {
    this.isReady = false;
    this.el.innerHTML = '';
    this.el.append(logo());
    if (story) this.el.append(h('div', { class: 'story-card plate' }, [h('div', { class: 'story-title', text: story.title }), h('div', { class: 'story-body', html: story.body })]));
    const box = h('div', { class: 'loading-box plate' });
    this.label = h('div', { class: 'loading-label', text: t('loading.title') });
    const prog = h('div', { class: 'progress' });
    this.bar = h('i');
    prog.append(this.bar);
    this.tip = h('div', { class: 'tip' });
    this.press = h('div', { class: 'press', text: t('loading.press') });
    box.append(this.label, prog, this.tip, this.press);
    this.el.append(box);
    this.nextTip();
    clearInterval(this.tipTimer);
    this.tipTimer = window.setInterval(() => this.nextTip(), 4500);
    this.el.classList.add('show');
  }

  private nextTip(): void {
    this.tip.innerHTML = `<b>${t('loading.tip')}</b>${t(pick(TIP_KEYS))}`;
  }

  progress(p: number, label?: string): void {
    this.bar.style.width = `${Math.round(p * 100)}%`;
    if (label) this.label.textContent = `${t('loading.title')} — ${label}`;
  }

  ready(): void {
    this.progress(1);
    this.isReady = true;
    this.press.classList.add('show');
  }

  hide(): void {
    clearInterval(this.tipTimer);
    this.el.classList.remove('show');
  }
}
