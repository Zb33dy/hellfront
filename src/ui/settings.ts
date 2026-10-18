import { t, type Lang } from '../core/i18n';
import { ACTIONS, keyLabel, type Action, type Settings, type SettingsStore } from '../core/settingsStore';
import { button, h, MenuNav, type UISound } from './dom';

type Tab = 'audio' | 'video' | 'controls' | 'game';

/** Settings screen; every change persists immediately through SettingsStore. */
export class SettingsScreen {
  readonly el = h('div', { class: 'screen', id: 'settings' });
  nav!: MenuNav;
  private tab: Tab = 'audio';
  private waitingBind: Action | null = null;
  onClose: (() => void) | null = null;

  constructor(private store: SettingsStore, private sound: (s: UISound) => void) {
    this.render();
  }

  /** Returns true while a key rebind is in progress (it swallows the next key). */
  captureKey(e: KeyboardEvent): boolean {
    if (!this.waitingBind) return false;
    if (e.code !== 'Escape') {
      const b = { ...this.store.data.bindings };
      // swap if the key is already used
      for (const a of ACTIONS) if (b[a] === e.code) b[a] = b[this.waitingBind];
      b[this.waitingBind] = e.code;
      this.store.update({ bindings: b });
      this.sound('ui_click');
    } else this.sound('ui_back');
    this.waitingBind = null;
    this.render();
    return true;
  }

  render(): void {
    const keepIndex = this.nav?.index ?? 0;
    const d = this.store.data;
    this.el.innerHTML = '';
    const box = h('div', { class: 'settings-box plate' });
    box.append(h('div', { class: 'panel-title', text: t('settings.title') }));
    const tabs = h('div', { class: 'tabs' });
    (['audio', 'video', 'controls', 'game'] as Tab[]).forEach((tb) => {
      const el = h('div', { class: 'tab' + (tb === this.tab ? ' active' : ''), text: t(`settings.${tb}`) });
      el.addEventListener('click', () => {
        this.sound('ui_click');
        this.tab = tb;
        this.nav.index = 0;
        this.render();
      });
      tabs.append(el);
    });
    box.append(tabs);
    const body = h('div', { class: 'settings-body' });
    const rows: HTMLElement[] = [];

    const slider = (label: string, key: keyof Settings, min: number, max: number, step: number, fmt: (v: number) => string) => {
      const row = h('div', { class: 'row' });
      row.dataset.kind = 'slider';
      const input = h('input', { attrs: { type: 'range', min: String(min), max: String(max), step: String(step) } });
      input.value = String(d[key]);
      const num = h('span', { class: 'num', text: fmt(d[key] as number) });
      input.addEventListener('input', () => {
        num.textContent = fmt(Number(input.value));
        this.store.update({ [key]: Number(input.value) } as Partial<Settings>);
      });
      row.append(h('span', { text: label }), h('div', { class: 'val' }, [input, num]));
      (row as HTMLElement & { adjust?: (dir: number) => void }).adjust = (dir) => {
        const v = Math.min(max, Math.max(min, Number(input.value) + dir * step));
        input.value = String(v);
        input.dispatchEvent(new Event('input'));
        this.sound('ui_hover');
      };
      rows.push(row);
      body.append(row);
    };
    const toggle = (label: string, key: keyof Settings) => {
      const row = h('div', { class: 'row' });
      const on = Boolean(d[key]);
      const tg = h('div', { class: 'toggle' + (on ? ' on' : ''), text: on ? t('on') : t('off') });
      tg.addEventListener('click', () => {
        this.sound('ui_click');
        this.store.update({ [key]: !this.store.data[key] } as Partial<Settings>);
        this.render();
      });
      row.append(h('span', { text: label }), h('div', { class: 'val' }, [tg]));
      (row as HTMLElement & { adjust?: (dir: number) => void }).adjust = () => tg.click();
      rows.push(row);
      body.append(row);
    };
    const choice = <T extends string | number>(label: string, key: keyof Settings, options: [T, string][]) => {
      const row = h('div', { class: 'row' });
      const val = h('div', { class: 'val' });
      options.forEach(([v, text]) => {
        const c = h('div', { class: 'choice' + (d[key] === v ? ' sel' : ''), text });
        c.addEventListener('click', () => {
          this.sound('ui_click');
          this.store.update({ [key]: v } as Partial<Settings>);
          this.render();
        });
        val.append(c);
      });
      row.append(h('span', { text: label }), val);
      (row as HTMLElement & { adjust?: (dir: number) => void }).adjust = (dir) => {
        const i = options.findIndex(([v]) => v === this.store.data[key]);
        const n = options[(i + dir + options.length) % options.length][0];
        this.sound('ui_click');
        this.store.update({ [key]: n } as Partial<Settings>);
        this.render();
      };
      rows.push(row);
      body.append(row);
    };

    const pct = (v: number) => `${Math.round(v * 100)}`;
    if (this.tab === 'audio') {
      slider(t('settings.master'), 'master', 0, 1, 0.05, pct);
      slider(t('settings.sfx'), 'sfx', 0, 1, 0.05, pct);
      slider(t('settings.voice'), 'voice', 0, 1, 0.05, pct);
      toggle(t('settings.subtitles'), 'subtitles');
    } else if (this.tab === 'video') {
      slider(t('settings.fov'), 'fov', 60, 110, 1, (v) => `${v}°`);
      choice(t('settings.renderScale'), 'renderScale', [[1, '100%'], [2, '50%'], [3, '33%']]);
      toggle(t('settings.bloom'), 'bloom');
      toggle(t('settings.grain'), 'grain');
      toggle(t('settings.retroLight'), 'retroLight');
    } else if (this.tab === 'controls') {
      slider(t('settings.sens'), 'sensitivity', 0.2, 3, 0.05, (v) => v.toFixed(2));
      toggle(t('settings.invertY'), 'invertY');
      body.append(h('div', { class: 'hint', text: t('settings.rebindHint') }));
      for (const a of ACTIONS) {
        const row = h('div', { class: 'row' });
        const waiting = this.waitingBind === a;
        const b = h('div', { class: 'bind' + (waiting ? ' wait' : ''), text: waiting ? t('settings.pressKey') : keyLabel(d.bindings[a]) });
        b.addEventListener('click', () => {
          this.sound('ui_click');
          this.waitingBind = a;
          this.render();
        });
        row.append(h('span', { text: t(`act.${a}`) }), h('div', { class: 'val' }, [b]));
        rows.push(row);
        body.append(row);
      }
      for (const [k, v] of [['act.fire', 'LMB'], ['act.cycle', 'WHEEL']]) {
        const row = h('div', { class: 'row' });
        row.append(h('span', { text: t(k) }), h('div', { class: 'val' }, [h('div', { class: 'bind', text: v })]));
        body.append(row);
      }
    } else {
      choice<Lang>(t('settings.language'), 'language', [['en', 'ENGLISH'], ['tr', 'TÜRKÇE']]);
      toggle(t('settings.subtitles'), 'subtitles');
    }
    box.append(body);
    const foot = h('div', { class: 'settings-foot' });
    const reset = button(t('settings.reset'), () => {
      this.store.reset();
      this.render();
    }, this.sound);
    const back = button(t('common.back'), () => this.close(), this.sound);
    foot.append(reset, back);
    box.append(foot);
    this.el.append(box);
    rows.push(reset, back);
    this.nav = new MenuNav(rows, this.sound, () => this.close(), (item) => void item);
    this.nav.onAdjust = (item, dir) => (item as HTMLElement & { adjust?: (dir: number) => void }).adjust?.(dir);
    // Tab switching with Q/E or Tab
    this.nav.focus(Math.min(keepIndex, rows.length - 1), true);
  }

  cycleTab(dir: number): void {
    const order: Tab[] = ['audio', 'video', 'controls', 'game'];
    this.tab = order[(order.indexOf(this.tab) + dir + order.length) % order.length];
    this.nav.index = 0;
    this.sound('ui_click');
    this.render();
  }

  close(): void {
    this.waitingBind = null;
    this.hide();
    this.onClose?.();
  }

  show(onClose: () => void): void {
    this.onClose = onClose;
    this.render();
    this.el.classList.add('show');
  }

  hide(): void {
    this.el.classList.remove('show');
  }

  get visible(): boolean {
    return this.el.classList.contains('show');
  }
}
