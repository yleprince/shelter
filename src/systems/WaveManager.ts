import { WAVE_BREATHER_MS } from '../config';
import { composeWave, isBossWave, waveSpawnIntervalMs, type EnemySpec } from './WaveComposer';

export type WavePhase = 'breather' | 'spawning' | 'clearing';

export class WaveManager {
  private waveNumber = 0;
  private currentPhase: WavePhase = 'breather';
  private breatherRemainingMs = WAVE_BREATHER_MS;
  private spawnTimerMs = 0;
  private spawnIntervalMs = 0;
  private queue: EnemySpec[] = [];

  get wave(): number {
    return this.waveNumber;
  }

  get phase(): WavePhase {
    return this.currentPhase;
  }

  get breatherSecondsLeft(): number {
    return Math.ceil(this.breatherRemainingMs / 1000);
  }

  get nextWaveIsBoss(): boolean {
    return isBossWave(this.waveNumber + 1);
  }

  skipBreather(): void {
    if (this.currentPhase === 'breather') this.startNextWave();
  }

  // Returns the enemies the caller should spawn this tick, in order.
  update(deltaMs: number, aliveEnemies: number): EnemySpec[] {
    switch (this.currentPhase) {
      case 'breather':
        this.breatherRemainingMs -= deltaMs;
        if (this.breatherRemainingMs <= 0) this.startNextWave();
        return [];
      case 'spawning':
        return this.updateSpawning(deltaMs);
      case 'clearing':
        if (aliveEnemies === 0) {
          this.currentPhase = 'breather';
          this.breatherRemainingMs = WAVE_BREATHER_MS;
        }
        return [];
    }
  }

  private startNextWave(): void {
    this.waveNumber++;
    this.currentPhase = 'spawning';
    this.queue = composeWave(this.waveNumber);
    this.spawnIntervalMs = waveSpawnIntervalMs(this.waveNumber);
    // Spawn the first enemy immediately rather than after one interval of dead air.
    this.spawnTimerMs = this.spawnIntervalMs;
  }

  private updateSpawning(deltaMs: number): EnemySpec[] {
    this.spawnTimerMs += deltaMs;
    const spawned: EnemySpec[] = [];
    while (this.spawnTimerMs >= this.spawnIntervalMs && this.queue.length > 0) {
      this.spawnTimerMs -= this.spawnIntervalMs;
      spawned.push(this.queue.shift()!);
    }
    if (this.queue.length === 0) this.currentPhase = 'clearing';
    return spawned;
  }
}
