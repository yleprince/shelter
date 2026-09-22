import { describe, expect, it } from 'vitest';
import { GAME_SPEEDS, MAX_FRAME_DELTA_MS, MAX_SIM_STEPS_PER_FRAME, SIM_STEP_MS } from '../src/config';
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
      expect(clock.advance(SIM_STEP_MS)).toBe(speed);
    });
  });

  it('carries leftover time into the next frame', () => {
    const clock = new GameClock();
    expect(clock.advance(SIM_STEP_MS * 0.6)).toBe(0);
    expect(clock.advance(SIM_STEP_MS * 0.6)).toBe(1);
  });

  it('caps a stalled frame before applying speed', () => {
    const clock = new GameClock();
    expect(clock.advance(10_000)).toBe(Math.floor(MAX_FRAME_DELTA_MS / SIM_STEP_MS));
  });

  it('never hands out more than MAX_SIM_STEPS_PER_FRAME steps', () => {
    const clock = new GameClock();
    clock.setSpeedLevel(GAME_SPEEDS.length - 1);
    expect(clock.advance(MAX_FRAME_DELTA_MS)).toBe(MAX_SIM_STEPS_PER_FRAME);
  });

  it('drops time over the step cap instead of banking it', () => {
    const clock = new GameClock();
    clock.setSpeedLevel(GAME_SPEEDS.length - 1);
    clock.advance(MAX_FRAME_DELTA_MS);
    clock.setSpeedLevel(0);
    expect(clock.advance(SIM_STEP_MS)).toBe(1);
  });

  it('ignores unknown speed levels', () => {
    const clock = new GameClock();
    clock.setSpeedLevel(99);
    expect(clock.speed).toBe(1);
  });
});

describe('GameClock pause', () => {
  it('simulates nothing while paused and does not burst on resume', () => {
    const clock = new GameClock();
    clock.togglePause();
    expect(clock.paused).toBe(true);
    for (let i = 0; i < 10; i++) expect(clock.advance(SIM_STEP_MS * 5)).toBe(0);
    clock.togglePause();
    expect(clock.advance(SIM_STEP_MS)).toBe(1);
  });

  it('keeps the pause across speed changes and resumes at the chosen speed', () => {
    const clock = new GameClock();
    clock.setPaused(true);
    clock.setSpeedLevel(1);
    expect(clock.paused).toBe(true);
    expect(clock.advance(SIM_STEP_MS)).toBe(0);
    clock.setPaused(false);
    expect(clock.advance(SIM_STEP_MS)).toBe(GAME_SPEEDS[1]);
  });
});
