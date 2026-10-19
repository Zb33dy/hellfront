/** Trauma-based screen shake: shake = trauma², smooth noise per axis. */
export class ScreenShake {
  private trauma = 0;
  private t = 0;
  yaw = 0;
  pitch = 0;
  roll = 0;

  reset(): void {
    this.trauma = 0;
    this.yaw = this.pitch = this.roll = 0;
  }

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const s = this.trauma * this.trauma;
    const n = (f: number, o: number) => Math.sin(this.t * f + o) * 0.6 + Math.sin(this.t * f * 2.3 + o * 1.7) * 0.4;
    this.yaw = s * 0.05 * n(31, 1.3);
    this.pitch = s * 0.05 * n(27, 4.1);
    this.roll = s * 0.035 * n(23, 7.7);
  }
}
