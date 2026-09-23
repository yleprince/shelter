// Fires every `everyMs`, at most `maxTimes` times: the cap is what guarantees a wave with a
// spawner in it still ends.
export class SpawnerTimer {
  private elapsedMs = 0;
  private fired = 0;

  constructor(
    private readonly everyMs: number,
    private readonly maxTimes: number,
  ) {}

  get remaining(): number {
    return this.maxTimes - this.fired;
  }

  // How many times it fired during this update.
  update(deltaMs: number): number {
    if (this.remaining === 0) return 0;
    this.elapsedMs += deltaMs;
    const due = Math.min(Math.floor(this.elapsedMs / this.everyMs), this.remaining);
    this.elapsedMs -= due * this.everyMs;
    this.fired += due;
    return due;
  }
}
