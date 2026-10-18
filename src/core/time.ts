/** Frame clock with dt clamping and hit-stop support. */
export class GameClock {
  elapsed = 0;
  dt = 0;
  private hitStop = 0;
  timeScale = 1;

  tick(rawDt: number): number {
    const d = Math.min(Math.max(rawDt, 0), 1 / 20);
    if (this.hitStop > 0) {
      this.hitStop -= d;
      this.dt = d * 0.15;
    } else {
      this.dt = d * this.timeScale;
    }
    this.elapsed += this.dt;
    return this.dt;
  }

  /** Brief slow-down used to sell heavy impacts. */
  freeze(seconds: number): void {
    this.hitStop = Math.max(this.hitStop, seconds);
  }
}
