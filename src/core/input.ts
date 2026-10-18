import type { Action, SettingsStore } from './settingsStore';

/**
 * Keyboard + mouse state with Pointer Lock. Edge-triggered queries ("pressed")
 * are valid for exactly one game frame; call endFrame() after the update.
 */
export class Input {
  private down = new Set<string>();
  private pressedSet = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  mouseDown = false;
  mousePressed = false;
  locked = false;
  /** Called when the pointer lock is lost by the browser (e.g. Esc). */
  onLockLost: (() => void) | null = null;
  /** Raw keydown hook, used by menus and key rebinding. Return true to swallow. */
  onRawKey: ((e: KeyboardEvent) => boolean) | null = null;

  constructor(private canvas: HTMLCanvasElement, private settings: SettingsStore) {
    window.addEventListener('keydown', (e) => {
      if (this.onRawKey && this.onRawKey(e)) {
        e.preventDefault();
        return;
      }
      if (['Space', 'Tab', 'F3', 'F4', 'ArrowUp', 'ArrowDown'].includes(e.code) || (this.locked && !e.ctrlKey)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressedSet.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseDown = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (this.locked) {
        this.mouseDown = true;
        this.mousePressed = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener(
      'wheel',
      (e) => {
        if (this.locked) this.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      if (was && !this.locked) {
        this.mouseDown = false;
        this.down.clear();
        this.onLockLost?.();
      }
    });
    window.addEventListener('contextmenu', (e) => {
      if (this.locked) e.preventDefault();
    });
  }

  async requestLock(): Promise<boolean> {
    if (this.locked) return true;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true } as PointerLockOptions) as unknown as Promise<void> | undefined;
      if (p && typeof (p as Promise<void>).then === 'function') await p;
      return true;
    } catch {
      try {
        const p2 = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (p2 && typeof (p2 as Promise<void>).then === 'function') await p2;
        return true;
      } catch {
        return false;
      }
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isDown(a: Action): boolean {
    const code = this.settings.data.bindings[a];
    if (a === 'sprint' && (this.down.has('ShiftLeft') || this.down.has('ShiftRight')) && code.startsWith('Shift')) return true;
    return this.down.has(code);
  }

  pressed(a: Action): boolean {
    return this.pressedSet.has(this.settings.data.bindings[a]);
  }

  codePressed(code: string): boolean {
    return this.pressedSet.has(code);
  }

  /** Simulated input for automated tests / debug hooks. */
  simulate(code: string, isDown: boolean): void {
    if (isDown) {
      if (!this.down.has(code)) this.pressedSet.add(code);
      this.down.add(code);
    } else this.down.delete(code);
  }

  endFrame(): void {
    this.pressedSet.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.mousePressed = false;
  }
}
