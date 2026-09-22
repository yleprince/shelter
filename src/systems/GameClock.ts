import { GAME_SPEEDS, MAX_FRAME_DELTA_MS, SIM_STEP_MS } from '../config';

const STEP_EPSILON = 1e-9;

// Turns real frame time into a whole number of fixed simulation steps. A fixed step keeps
// fast-forward honest: at x50 one frame is ~800 ms of game time, which would let
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

  // Returns how many SIM_STEP_MS steps to simulate for this frame.
  advance(realDeltaMs: number): number {
    // Paused time is dropped rather than banked, so resuming never bursts steps.
    if (this.isPaused) return 0;
    this.accumulatorMs += Math.min(realDeltaMs, MAX_FRAME_DELTA_MS) * this.speed;
    // SIM_STEP_MS isn't exactly representable, so whole multiples can land a hair short.
    const steps = Math.floor(this.accumulatorMs / SIM_STEP_MS + STEP_EPSILON);
    this.accumulatorMs -= steps * SIM_STEP_MS;
    return steps;
  }
}
