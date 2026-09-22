import { describe, expect, it } from 'vitest';
import { GAME_SPEEDS, MAX_FRAME_DELTA_MS, SIM_STEP_MS } from '../src/config';
import { GameClock } from '../src/systems/GameClock';

describe('GameClock', () => {
  it('starts at x1 and simulates one step per 60 Hz frame', () => {
    const clock = new GameClock();
    expect(clock.speed).toBe(1);
    expect(clock.advance(SIM_STEP_MS)).toBe(1);
  });

  it('scales the step count with speed', () => {
    GAME_SPEEDS.forEach((speed, level) => {
      const clock = new GameClock();
      clock.setSpeedLevel(level);
      expect(clock.speed).toBe(speed);
      expect(clock.advance(SIM_STEP_MS * 3)).toBe(3 * speed);
    });
  });

  it('carries leftover time into the next frame', () => {
    const clock = new GameClock();
    expect(clock.advance(SIM_STEP_MS * 0.6)).toBe(0);
    expect(clock.advance(SIM_STEP_MS * 0.6)).toBe(1);
  });

  it('caps a stalled frame before applying speed', () => {
    const clock = new GameClock();
    clock.setSpeedLevel(GAME_SPEEDS.length - 1);
    const maxSpeed = GAME_SPEEDS[GAME_SPEEDS.length - 1];
    expect(clock.advance(10_000)).toBe(Math.floor((MAX_FRAME_DELTA_MS * maxSpeed) / SIM_STEP_MS));
  });

  it('ignores unknown speed levels', () => {
    const clock = new GameClock();
    clock.setSpeedLevel(99);
    expect(clock.speed).toBe(1);
  });
});
