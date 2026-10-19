import { t } from '../core/i18n';
import type { AmmoType, KeyColor, WeaponId } from '../core/config';
import { faceCanvas, type FaceExpr } from '../gfx/faceGen';
import { h } from './dom';

/** Expression logic for the status-bar portrait. */
class FaceController {
  private grin = 0;
  private ouch = 0;
  private look: -1 | 0 | 1 = 0;
  private lookTimer = 0;
  private glance = 1.5;
  private rage = 0;
  private last = '';

  constructor(private holder: HTMLElement) {}

  damage(side: -1 | 0 | 1, amount: number): void {
    this.look = side;
    this.lookTimer = 0.9;
    if (amount >= 20) this.ouch = 0.7;
    this.holder.classList.remove('hit');
    void this.holder.offsetWidth;
    this.holder.classList.add('hit');
  }

  pickupWeapon(): void {
    this.grin = 1.6;
  }

  firing(dt: number, holding: boolean): void {
    this.rage = holding ? this.rage + dt : 0;
  }

  update(dt: number, health: number, dead: boolean): void {
    this.grin -= dt;
    this.ouch -= dt;
    this.lookTimer -= dt;
    this.glance -= dt;
    if (this.lookTimer <= 0) {
      if (this.glance <= 0) {
        this.look = this.look === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        this.glance = this.look === 0 ? 1 + Math.random() * 2 : 0.4 + Math.random() * 0.4;
      }
    }
    const tier = health >= 80 ? 0 : health >= 60 ? 1 : health >= 40 ? 2 : health >= 20 ? 3 : 4;
    let expr: FaceExpr = 'normal';
    if (dead) expr = 'dead';
    else if (this.ouch > 0) expr = 'ouch';
    else if (this.grin > 0) expr = 'grin';
    else if (this.rage > 1.2) expr = 'rage';
    const look = dead || expr !== 'normal' ? (expr === 'ouch' ? this.look : 0) : this.look;
    const key = `${tier}${look}${expr}`;
    if (key !== this.last) {
      this.last = key;
      this.holder.innerHTML = '';
      this.holder.append(faceCanvas(tier, look, expr, 3).cloneNode() as HTMLCanvasElement);
      const c = this.holder.firstChild as HTMLCanvasElement;
      c.getContext('2d')!.drawImage(faceCanvas(tier, look, expr, 3), 0, 0);
    }
  }
}

export class HUD {
  readonly el = h('div', { class: 'screen', id: 'hud' });
  readonly face: FaceController;
  private ammoNum: HTMLElement;
  private hpNum: HTMLElement;
  private arNum: HTMLElement;
  private armsEls: HTMLElement[] = [];
  private keyEls: Record<KeyColor, HTMLElement>;
  private resRows: Record<AmmoType, HTMLElement>;
  private resVals: Record<AmmoType, HTMLElement>;
  private hitEl: HTMLElement;
  private dmgEls: HTMLElement[] = [];
  private dmgTimers: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  private flashEls: Record<'red' | 'gold' | 'toxic', HTMLElement>;
  private flashT = { red: 0, gold: 0, toxic: 0 };
  private lowEl: HTMLElement;
  private msgEl: HTMLElement;
  private objEl: HTMLElement;
  private bossEl: HTMLElement;
  private bossName: HTMLElement;
  private bossFill: HTMLElement;
  private bossKey: string | null = null;
  private focusEl: HTMLElement;
  private focusFill: HTMLElement;
  private scopeEl: HTMLElement;
  private slowEl: HTMLElement;
  private bannerEl: HTMLElement;
  private styleEl: HTMLElement;
  private styleLetter: HTMLElement;
  private styleName: HTMLElement;
  private styleFill: HTMLElement;
  private styleFeed: HTMLElement;
  private promptEl: HTMLElement;
  private scoreEl: HTMLElement;
  private bannerTimer = 0;
  readonly clickEl: HTMLElement;
  readonly viewLayer: HTMLElement;
  private cache: Record<string, string> = {};
  private labels: HTMLElement[] = [];

  constructor() {
    this.viewLayer = h('div');
    this.el.append(this.viewLayer);
    this.lowEl = h('div', { class: 'lowhp' });
    this.flashEls = { red: h('div', { class: 'flash-overlay red' }), gold: h('div', { class: 'flash-overlay gold' }), toxic: h('div', { class: 'flash-overlay toxic' }) };
    this.el.append(this.lowEl, this.flashEls.red, this.flashEls.gold, this.flashEls.toxic);
    const cross = h('div', { class: 'crosshair' }, [h('i'), h('i'), h('i'), h('i')]);
    this.hitEl = h('div', { class: 'hitmarker' });
    const ring = h('div', { class: 'dmg-ring' });
    for (let i = 0; i < 8; i++) {
      const d = h('i');
      d.style.transform = `rotate(${i * 45}deg)`;
      ring.append(d);
      this.dmgEls.push(d);
    }
    this.msgEl = h('div', { class: 'messages' });
    this.objEl = h('div', { class: 'objective' });
    this.clickEl = h('div', { class: 'click-to-play' });
    this.bossName = h('div', { class: 'boss-name' });
    this.bossFill = h('i');
    this.bossEl = h('div', { class: 'boss-bar hidden' }, [this.bossName, h('div', { class: 'boss-track' }, [this.bossFill])]);
    this.focusFill = h('i');
    this.focusEl = h('div', { class: 'focus-meter' }, [h('b', { text: 'Q' }), h('div', { class: 'focus-track' }, [this.focusFill])]);
    this.scopeEl = h('div', { class: 'scope-overlay' }, [h('i')]);
    this.slowEl = h('div', { class: 'slowmo-overlay' });
    this.el.prepend(this.scopeEl, this.slowEl);
    this.bannerEl = h('div', { class: 'round-banner' });
    this.styleLetter = h('b');
    this.styleName = h('span', { class: 'style-name' });
    this.styleFill = h('i');
    this.styleFeed = h('div', { class: 'style-feed' });
    this.styleEl = h('div', { class: 'style-meter' }, [this.styleLetter, this.styleName, h('div', { class: 'style-track' }, [this.styleFill]), this.styleFeed]);
    this.promptEl = h('div', { class: 'ctx-prompt' });
    this.scoreEl = h('div', { class: 'siege-score' });
    this.el.append(this.bannerEl, this.styleEl, this.promptEl, this.scoreEl);
    this.el.append(cross, this.hitEl, ring, this.msgEl, this.objEl, this.clickEl, this.bossEl, this.focusEl);

    const bar = h('div', { class: 'hud-bar' });
    const cell = (cls = '') => h('div', { class: 'hud-cell ' + cls });
    const label = (key: string) => {
      const l = h('div', { class: 'hud-label', text: t(key) });
      l.dataset.key = key;
      this.labels.push(l);
      return l;
    };
    const c1 = cell();
    this.ammoNum = h('div', { class: 'hud-num', text: '50' });
    c1.append(this.ammoNum, label('hud.ammo'));
    const c2 = cell();
    this.hpNum = h('div', { class: 'hud-num', text: '100%' });
    c2.append(this.hpNum, label('hud.health'));
    const c3 = cell();
    const arms = h('div', { class: 'arms' });
    for (let i = 1; i <= 5; i++) {
      const s = h('span', { text: String(i) });
      this.armsEls.push(s);
      arms.append(s);
    }
    c3.append(arms, label('hud.arms'));
    const c4 = cell('face-cell');
    this.face = new FaceController(c4);
    const c5 = cell();
    this.arNum = h('div', { class: 'hud-num', text: '0%' });
    c5.append(this.arNum, label('hud.armor'));
    const c6 = cell();
    const keys = h('div', { class: 'keys' });
    this.keyEls = { red: h('i', { class: 'red' }), blue: h('i', { class: 'blue' }), yellow: h('i', { class: 'yellow' }) };
    keys.append(this.keyEls.blue, this.keyEls.yellow, this.keyEls.red);
    c6.append(keys);
    const c7 = cell();
    const table = h('div', { class: 'ammo-table' });
    const row = (name: string) => {
      const v = h('span');
      const r = h('div', {}, [h('span', { text: name }), v]);
      table.append(r);
      return [r, v] as const;
    };
    const [rb, vb] = row('BULL');
    const [rs, vs] = row('SHEL');
    const [rr, vr] = row('RNDS');
    const [rk, vk] = row('RCKT');
    const [rg, vg] = row('GREN');
    this.resRows = { bullets: rb, shells: rs, rounds: rr, rockets: rk, grenades: rg };
    this.resVals = { bullets: vb, shells: vs, rounds: vr, rockets: vk, grenades: vg };
    c7.append(table);
    bar.append(c1, c2, c3, c4, c5, c6, c7);
    this.el.append(bar);
  }

  relabel(): void {
    for (const l of this.labels) l.textContent = t(l.dataset.key!);
    this.clickEl.textContent = t('hud.clickToPlay');
  }

  private setText(key: string, el: HTMLElement, v: string, flash = false): void {
    if (this.cache[key] === v) return;
    const prev = this.cache[key];
    this.cache[key] = v;
    el.textContent = v;
    if (flash && prev !== undefined) {
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    }
  }

  setHealth(v: number): void {
    this.setText('hp', this.hpNum, `${Math.max(0, Math.ceil(v))}%`, true);
    this.hpNum.classList.toggle('low', v <= 25 && v > 0);
    this.lowEl.style.opacity = v <= 25 && v > 0 ? String(0.35 + (25 - v) / 40) : '0';
  }

  setArmor(v: number): void {
    this.setText('ar', this.arNum, `${Math.ceil(v)}%`, true);
  }

  setAmmo(v: number | null): void {
    this.setText('am', this.ammoNum, v === null ? '—' : String(v), true);
  }

  setReserves(r: Record<AmmoType, number>, max: Record<AmmoType, number>, current: AmmoType | null): void {
    for (const k of ['bullets', 'shells', 'rounds', 'rockets', 'grenades'] as AmmoType[]) {
      const s = `${r[k]}<b>/${max[k]}</b>`;
      if (this.cache['res' + k] !== s) {
        this.cache['res' + k] = s;
        this.resVals[k].innerHTML = s;
      }
      this.resRows[k].classList.toggle('cur', current === k);
    }
  }

  setArms(owned: Set<WeaponId>, current: WeaponId): void {
    const ids: WeaponId[] = ['pistol', 'shotgun', 'chainsword', 'sniper', 'launcher'];
    ids.forEach((id, i) => {
      this.armsEls[i].classList.toggle('owned', owned.has(id));
      this.armsEls[i].classList.toggle('active', current === id);
    });
  }

  setKeys(keys: Set<KeyColor>): void {
    for (const k of ['red', 'blue', 'yellow'] as KeyColor[]) this.keyEls[k].classList.toggle('have', keys.has(k));
  }

  message(text: string): void {
    const d = h('div', { text });
    this.msgEl.append(d);
    while (this.msgEl.children.length > 4) this.msgEl.firstChild!.remove();
    setTimeout(() => d.classList.add('out'), 3200);
    setTimeout(() => d.remove(), 3900);
  }

  /** Focus (bullet time) meter: fraction left and whether it is running. */
  setFocus(frac: number, active: boolean): void {
    const w = (Math.max(0, Math.min(1, frac)) * 100).toFixed(0) + '%';
    if (this.cache.focus !== w) {
      this.cache.focus = w;
      this.focusFill.style.width = w;
    }
    this.focusEl.classList.toggle('active', active);
    this.focusEl.classList.toggle('ready', frac >= 0.999);
    this.slowEl.classList.toggle('show', active);
  }

  /** Style rank panel. points 0 hides it. */
  setStyle(letter: string, name: string, progress: number, visible: boolean, rankIdx: number): void {
    this.styleEl.classList.toggle('show', visible);
    if (this.cache.styleL !== letter) {
      this.cache.styleL = letter;
      this.styleLetter.textContent = letter;
      this.styleName.textContent = name;
      this.styleEl.dataset.rank = String(rankIdx);
      this.styleLetter.classList.remove('pop');
      void this.styleLetter.offsetWidth;
      this.styleLetter.classList.add('pop');
    }
    this.styleFill.style.width = (Math.max(0, Math.min(1, progress)) * 100).toFixed(0) + '%';
  }

  styleBonus(text: string): void {
    const d = h('div', { text });
    this.styleFeed.prepend(d);
    while (this.styleFeed.children.length > 4) this.styleFeed.lastChild!.remove();
    setTimeout(() => d.classList.add('out'), 1400);
    setTimeout(() => d.remove(), 1900);
  }

  /** Small prompt under the crosshair (glory kills, shop). */
  prompt(text: string | null): void {
    const v = text ?? '';
    if (this.cache.prompt === v) return;
    this.cache.prompt = v;
    this.promptEl.textContent = v;
    this.promptEl.classList.toggle('show', !!text);
  }

  /** Siege score / souls readout. */
  setScore(text: string | null): void {
    const v = text ?? '';
    if (this.cache.score === v) return;
    this.cache.score = v;
    this.scoreEl.textContent = v;
    this.scoreEl.classList.toggle('show', !!text);
  }

  /** Big centered announcement (Siege rounds). */
  banner(title: string, sub: string): void {
    this.bannerEl.innerHTML = '';
    this.bannerEl.append(h('b', { text: title }));
    if (sub) this.bannerEl.append(h('span', { text: sub }));
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.remove('show'), 2600);
  }

  setScope(on: boolean): void {
    this.scopeEl.classList.toggle('show', on);
    this.el.classList.toggle('scoped', on);
  }

  /** Boss health bar; null hides it. */
  setBoss(nameKey: string | null, frac: number): void {
    if (nameKey !== this.bossKey) {
      this.bossKey = nameKey;
      this.bossEl.classList.toggle('hidden', !nameKey);
      if (nameKey) this.bossName.textContent = t(nameKey);
    }
    if (nameKey) this.bossFill.style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
  }

  objective(text: string): void {
    this.objEl.innerHTML = '';
    if (!text) return;
    this.objEl.append(h('b', { text: t('obj.label') }), h('span', { text }));
    this.objEl.classList.remove('new');
    void this.objEl.offsetWidth;
    this.objEl.classList.add('new');
  }

  hitMarker(kill: boolean): void {
    this.hitEl.classList.remove('on', 'kill');
    void this.hitEl.offsetWidth;
    this.hitEl.classList.add('on');
    if (kill) this.hitEl.classList.add('kill');
  }

  /** angle: radians relative to view forward (0 = front, +π/2 = right). */
  damageFrom(angle: number, amount: number): void {
    const idx = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
    this.dmgTimers[idx] = Math.min(1.2, 0.5 + amount / 30);
  }

  flash(kind: 'red' | 'gold' | 'toxic', strength: number): void {
    this.flashT[kind] = Math.max(this.flashT[kind], strength);
  }

  update(dt: number): void {
    for (let i = 0; i < 8; i++) {
      this.dmgTimers[i] = Math.max(0, this.dmgTimers[i] - dt);
      this.dmgEls[i].style.opacity = String(Math.min(1, this.dmgTimers[i] * 1.5));
    }
    for (const k of ['red', 'gold', 'toxic'] as const) {
      this.flashT[k] = Math.max(0, this.flashT[k] - dt * (k === 'red' ? 1.6 : 2.5));
      this.flashEls[k].style.opacity = String(Math.min(0.9, this.flashT[k]));
    }
  }

  reset(): void {
    this.cache = {};
    this.msgEl.innerHTML = '';
    this.objEl.innerHTML = '';
    this.flashT = { red: 0, gold: 0, toxic: 0 };
  }

  show(): void {
    this.el.classList.add('show');
  }
  hide(): void {
    this.el.classList.remove('show');
  }
}
