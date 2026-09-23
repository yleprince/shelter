import { describe, expect, it } from 'vitest';
import { SpawnerTimer } from '../src/systems/SpawnerTimer';

describe('SpawnerTimer', () => {
  it('fires every interval', () => {
    const timer = new SpawnerTimer(4000, 5);
    expect(timer.update(3999)).toBe(0);
    expect(timer.update(1)).toBe(1);
    expect(timer.update(8000)).toBe(2);
    expect(timer.remaining).toBe(2);
  });

  it('stops at its cap, so a wave with a spawner still ends', () => {
    const timer = new SpawnerTimer(4000, 5);
    expect(timer.update(100_000)).toBe(5);
    expect(timer.update(100_000)).toBe(0);
    expect(timer.remaining).toBe(0);
  });
});
