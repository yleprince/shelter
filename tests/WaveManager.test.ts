import { describe, expect, it } from 'vitest';
import {
  ENEMY_BASE_SPEED,
  WAVE_BREATHER_MS,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_SPEED_MAX_MULTIPLIER,
} from '../src/config';
import { WaveManager, waveStats } from '../src/systems/WaveManager';

describe('waveStats', () => {
  it('grows enemy count and hp each wave', () => {
    const w1 = waveStats(1);
    const w5 = waveStats(5);
    expect(w5.enemyCount).toBeGreaterThan(w1.enemyCount);
    expect(w5.enemyHp).toBeGreaterThan(w1.enemyHp);
  });

  it('caps speed', () => {
    expect(waveStats(1000).enemySpeed).toBe(ENEMY_BASE_SPEED * WAVE_SPEED_MAX_MULTIPLIER);
  });
});

describe('WaveManager', () => {
  it('waits for the breather, then spawns the whole wave', () => {
    const waves = new WaveManager();
    expect(waves.update(WAVE_BREATHER_MS - 1, 0)).toBe(0);
    expect(waves.wave).toBe(0);
    waves.update(1, 0);
    expect(waves.wave).toBe(1);
    expect(waves.phase).toBe('spawning');

    const total = waveStats(1).enemyCount;
    let spawned = 0;
    for (let i = 0; i < total * 2; i++) spawned += waves.update(WAVE_SPAWN_INTERVAL_MS, spawned);
    expect(spawned).toBe(total);
    expect(waves.phase).toBe('clearing');
  });

  it('only starts the next breather once the field is clear', () => {
    const waves = new WaveManager();
    waves.skipBreather();
    for (let i = 0; i < 100; i++) waves.update(WAVE_SPAWN_INTERVAL_MS, 3);
    expect(waves.phase).toBe('clearing');
    waves.update(16, 0);
    expect(waves.phase).toBe('breather');
    expect(waves.breatherSecondsLeft).toBe(Math.ceil(WAVE_BREATHER_MS / 1000));
  });

  it('ignores skip outside of the breather', () => {
    const waves = new WaveManager();
    waves.skipBreather();
    waves.skipBreather();
    expect(waves.wave).toBe(1);
  });
});
