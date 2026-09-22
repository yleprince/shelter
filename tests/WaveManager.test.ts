import { describe, expect, it } from 'vitest';
import { BOSS_WAVE_INTERVAL, WAVE_BREATHER_MS, WAVE_SPAWN_INTERVAL_MS } from '../src/config';
import { composeWave } from '../src/systems/WaveComposer';
import { WaveManager } from '../src/systems/WaveManager';

function runWave(waves: WaveManager): string[] {
  const kinds: string[] = [];
  for (let i = 0; i < 1000 && waves.phase === 'spawning'; i++) {
    kinds.push(...waves.update(WAVE_SPAWN_INTERVAL_MS, kinds.length).map((spec) => spec.kind));
  }
  return kinds;
}

describe('WaveManager', () => {
  it('waits for the breather, then spawns the whole composed wave in order', () => {
    const waves = new WaveManager();
    expect(waves.update(WAVE_BREATHER_MS - 1, 0)).toEqual([]);
    expect(waves.wave).toBe(0);
    waves.update(1, 0);
    expect(waves.wave).toBe(1);
    expect(waves.phase).toBe('spawning');

    const kinds = runWave(waves);
    expect(kinds).toEqual(composeWave(1).map((spec) => spec.kind));
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

  it('flags the upcoming boss wave during the preceding breather', () => {
    const waves = new WaveManager();
    for (let wave = 1; wave < BOSS_WAVE_INTERVAL; wave++) {
      expect(waves.nextWaveIsBoss).toBe(false);
      waves.skipBreather();
      runWave(waves);
      waves.update(16, 0);
    }
    expect(waves.phase).toBe('breather');
    expect(waves.nextWaveIsBoss).toBe(true);
  });
});
