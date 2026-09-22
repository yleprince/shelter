import { GAME_SPEEDS, MAX_FRAME_DELTA_MS, MAX_SIM_STEPS_PER_FRAME, SIM_STEP_MS } from '../config';

const STEP_EPSILON = 1e-9;

// Turns real frame time into a whole number of fixed simulation steps. A fixed step keeps
// fast-forward honest: at x500 one frame is ~8 s of game time, which would let
// projectiles tunnel straight through enemies if simulated in a single update.
export class GameClock {
  private speedIndex = 0;
  private accumulatorMs = 0;
  private isPaused = false;

  get speed(): number {
    return GAME_SPEEDS[this.speedIndex];
  }

  get speedLevel(): number {
    return this.speedIndex;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  setSpeedLevel(index: number): void {
    if (index >= 0 && index < GAME_SPEEDS.length) this.speedIndex = index;
  }

  // Clears the accumulator too: time already banked at the old speed would otherwise keep
  // running at x500 after the drop.
  dropToBaseSpeed(): boolean {
    if (this.speedIndex === 0) return false;
    this.speedIndex = 0;
    this.accumulatorMs = 0;
    return true;
  }

  // Returns how many SIM_STEP_MS steps to simulate for this frame.
  advance(realDeltaMs: number): number {
    // Paused time is dropped rather than banked, so resuming never bursts steps.
    if (this.isPaused) return 0;
    this.accumulatorMs += Math.min(realDeltaMs, MAX_FRAME_DELTA_MS) * this.speed;
    // SIM_STEP_MS isn't exactly representable, so whole multiples can land a hair short.
    const steps = Math.floor(this.accumulatorMs / SIM_STEP_MS + STEP_EPSILON);
    if (steps > MAX_SIM_STEPS_PER_FRAME) {
      // Dropped rather than banked, like paused time: a slow machine just runs below x500.
      this.accumulatorMs = 0;
      return MAX_SIM_STEPS_PER_FRAME;
    }
    this.accumulatorMs -= steps * SIM_STEP_MS;
    return steps;
  }
}
