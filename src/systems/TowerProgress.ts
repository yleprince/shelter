import { TOWER_SELL_REFUND_RATIO } from '../config';
import { TOWER_LEVELS, type TowerLevel } from '../data/towerLevels';
import type { Economy } from './Economy';

export type UpgradeBlocker = 'max-level' | 'locked' | 'too-expensive';

export class TowerProgress {
  private levelIndex = 0;
  private invested = TOWER_LEVELS[0].cost;

  get level(): number {
    return this.stats.level;
  }

  get stats(): TowerLevel {
    return TOWER_LEVELS[this.levelIndex];
  }

  get nextLevel(): TowerLevel | undefined {
    return TOWER_LEVELS[this.levelIndex + 1];
  }

  get totalInvested(): number {
    return this.invested;
  }

  get sellValue(): number {
    return Math.floor(this.invested * TOWER_SELL_REFUND_RATIO);
  }

  upgradeBlocker(wave: number, balance: number): UpgradeBlocker | null {
    const next = this.nextLevel;
    if (!next) return 'max-level';
    if (wave < next.unlockWave) return 'locked';
    if (balance < next.cost) return 'too-expensive';
    return null;
  }

  upgrade(wave: number, economy: Economy): boolean {
    const next = this.nextLevel;
    if (!next || this.upgradeBlocker(wave, economy.balance) || !economy.spend(next.cost)) return false;
    this.levelIndex++;
    this.invested += next.cost;
    return true;
  }
}
