import { t } from '../core/i18n';
import { formatTime } from '../core/util';
import { button, h, MenuNav, type UISound } from './dom';
import { logo } from './menu';

export interface LevelStats {
  kills: number;
  totalKills: number;
  items: number;
  totalItems: number;
  secrets: number;
  totalSecrets: number;
  time: number;
  par: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 100);

/** Tallies stats Doom-style, then hands off to the chapter end screen. */
export class LevelCompleteScreen {
  readonly el = h('div', { class: 'screen overlay', id: 'complete' });
  nav: MenuNav | null = null;
  private raf = 0;

  constructor(private sound: (s: UISound) => void, private onContinue: () => void) {}

  show(stats: LevelStats): void {
    this.el.innerHTML = '';
    const box = h('div', { class: 'complete-box plate' });
    box.append(h('div', { class: 'panel-title', text: t('complete.title') }));
    const mk = (label: string) => {
      const v = h('span', { text: '0%' });
      box.append(h('div', { class: 'stat' }, [h('span', { text: label }), v]));
      return v;
    };
    const kv = mk(t('complete.kills'));
    const iv = mk(t('complete.items'));
    const sv = mk(t('complete.secrets'));
    const tv = mk(t('complete.time'));
    const pv = mk(t('complete.par'));
    const cont = button(t('complete.continue'), () => {
      cancelAnimationFrame(this.raf);
      this.onContinue();
    }, this.sound);
    cont.style.marginTop = '20px';
    box.append(cont);
    this.el.append(box);
    this.nav = new MenuNav([cont], this.sound, null);
    this.el.classList.add('show');

    const targets = [pct(stats.kills, stats.totalKills), pct(stats.items, stats.totalItems), pct(stats.secrets, stats.totalSecrets)];
    const start = performance.now();
    let lastTick = 0;
    const step = (now: number) => {
      const e = (now - start) / 1000;
      const k = (i: number) => Math.min(1, Math.max(0, (e - i * 0.7) / 0.6));
      kv.textContent = `${Math.round(targets[0] * k(0))}%`;
      iv.textContent = `${Math.round(targets[1] * k(1))}%`;
      sv.textContent = `${Math.round(targets[2] * k(2))}%`;
      tv.textContent = formatTime(stats.time * k(3));
      pv.textContent = formatTime(stats.par * k(4));
      if (now - lastTick > 70 && e < 3.6) {
        lastTick = now;
        this.sound('ui_hover');
      }
      if (e < 3.6) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  hide(): void {
    cancelAnimationFrame(this.raf);
    this.el.classList.remove('show');
  }
}

export class ChapterEndScreen {
  readonly el = h('div', { class: 'screen overlay', id: 'chapter' });
  nav: MenuNav | null = null;

  constructor(private sound: (s: UISound) => void, private onMenu: () => void) {}

  show(): void {
    this.el.innerHTML = '';
    this.el.append(logo());
    const box = h('div', { class: 'complete-box plate' });
    box.style.marginTop = '30px';
    box.append(h('div', { class: 'panel-title', text: t('chapter.title') }));
    box.append(h('div', { class: 'chapter-body', html: t('chapter.body') }));
    const b = button(t('chapter.menu'), () => this.onMenu(), this.sound);
    box.append(b);
    this.el.append(box);
    this.nav = new MenuNav([b], this.sound, null);
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }
}
