import {
  ENEMY_BASE_HP,
  ENEMY_BASE_SPEED,
  WAVE_BASE_ENEMY_COUNT,
  WAVE_BREATHER_MS,
  WAVE_COUNT_INCREMENT,
  WAVE_HP_SCALE_PER_WAVE,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_SPEED_MAX_MULTIPLIER,
  WAVE_SPEED_SCALE_PER_WAVE,
} from '../config';

export interface WaveStats {
  enemyCount: number;
  enemyHp: number;
  enemySpeed: number;
}

export type WavePhase = 'breather' | 'spawning' | 'clearing';

export function waveStats(wave: number): WaveStats {
  const speedMultiplier = Math.min(1 + wave * WAVE_SPEED_SCALE_PER_WAVE, WAVE_SPEED_MAX_MULTIPLIER);
  return {
    enemyCount: WAVE_BASE_ENEMY_COUNT + wave * WAVE_COUNT_INCREMENT,
    enemyHp: Math.round(ENEMY_BASE_HP * (1 + wave * WAVE_HP_SCALE_PER_WAVE)),
    enemySpeed: ENEMY_BASE_SPEED * speedMultiplier,
  };
}

export class WaveManager {
  private waveNumber = 0;
  private currentPhase: WavePhase = 'breather';
  private breatherRemainingMs = WAVE_BREATHER_MS;
  private spawnTimerMs = 0;
  private spawnedThisWave = 0;

  get wave(): number {
    return this.waveNumber;
  }

  get phase(): WavePhase {
    return this.currentPhase;
  }

  get breatherSecondsLeft(): number {
    return Math.ceil(this.breatherRemainingMs / 1000);
  }

  get currentStats(): WaveStats {
    return waveStats(this.waveNumber);
  }

  skipBreather(): void {
    if (this.currentPhase === 'breather') this.startNextWave();
  }

  // Returns how many enemies the caller should spawn this tick.
  update(deltaMs: number, aliveEnemies: number): number {
    switch (this.currentPhase) {
      case 'breather':
        this.breatherRemainingMs -= deltaMs;
        if (this.breatherRemainingMs <= 0) this.startNextWave();
        return 0;
      case 'spawning':
        return this.updateSpawning(deltaMs);
      case 'clearing':
        if (aliveEnemies === 0) {
          this.currentPhase = 'breather';
          this.breatherRemainingMs = WAVE_BREATHER_MS;
        }
        return 0;
    }
  }

  private startNextWave(): void {
    this.waveNumber++;
    this.currentPhase = 'spawning';
    this.spawnedThisWave = 0;
    // Spawn the first enemy immediately rather than after one interval of dead air.
    this.spawnTimerMs = WAVE_SPAWN_INTERVAL_MS;
  }

  private updateSpawning(deltaMs: number): number {
    const total = this.currentStats.enemyCount;
    this.spawnTimerMs += deltaMs;
    let toSpawn = 0;
    while (this.spawnTimerMs >= WAVE_SPAWN_INTERVAL_MS && this.spawnedThisWave < total) {
      this.spawnTimerMs -= WAVE_SPAWN_INTERVAL_MS;
      this.spawnedThisWave++;
      toSpawn++;
    }
    if (this.spawnedThisWave >= total) this.currentPhase = 'clearing';
    return toSpawn;
  }
}
