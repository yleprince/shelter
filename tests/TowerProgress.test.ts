import { describe, expect, it } from 'vitest';
import { TOWER_SELL_REFUND_RATIO } from '../src/config';
import { TOWER_LEVELS } from '../src/data/towerLevels';
import { Economy } from '../src/systems/Economy';
import { TowerProgress } from '../src/systems/TowerProgress';

describe('TowerProgress', () => {
  it('starts at Lv1 with the placement cost invested', () => {
    const tower = new TowerProgress();
    expect(tower.level).toBe(1);
    expect(tower.stats).toBe(TOWER_LEVELS[0]);
    expect(tower.totalInvested).toBe(TOWER_LEVELS[0].cost);
  });

  it('upgrades through every level, charging each cost and switching stats', () => {
    const tower = new TowerProgress();
    const economy = new Economy(10_000);
    for (const next of TOWER_LEVELS.slice(1)) {
      expect(tower.upgrade(next.unlockWave, economy)).toBe(true);
      expect(tower.stats).toBe(next);
    }
    const upgradeCosts = TOWER_LEVELS.slice(1).reduce((sum, l) => sum + l.cost, 0);
    expect(economy.balance).toBe(10_000 - upgradeCosts);
    expect(tower.totalInvested).toBe(TOWER_LEVELS.reduce((sum, l) => sum + l.cost, 0));
    expect(tower.upgradeBlocker(100, 10_000)).toBe('max-level');
    expect(tower.upgrade(100, economy)).toBe(false);
  });

  it('is gated by wave, then by cost, without charging when blocked', () => {
    const tower = new TowerProgress();
    const economy = new Economy(10_000);
    tower.upgrade(1, economy);
    const lv3 = TOWER_LEVELS[2];
    const before = economy.balance;
    expect(tower.upgradeBlocker(lv3.unlockWave - 1, before)).toBe('locked');
    expect(tower.upgrade(lv3.unlockWave - 1, economy)).toBe(false);
    expect(economy.balance).toBe(before);

    const poor = new Economy(lv3.cost - 1);
    expect(tower.upgradeBlocker(lv3.unlockWave, poor.balance)).toBe('too-expensive');
    expect(tower.upgrade(lv3.unlockWave, poor)).toBe(false);
    expect(poor.balance).toBe(lv3.cost - 1);
    expect(tower.level).toBe(2);
  });

  it('refunds a share of everything invested, rounded down', () => {
    const tower = new TowerProgress();
    expect(tower.sellValue).toBe(Math.floor(TOWER_LEVELS[0].cost * TOWER_SELL_REFUND_RATIO));
    tower.upgrade(1, new Economy(1000));
    expect(tower.sellValue).toBe(Math.floor((TOWER_LEVELS[0].cost + TOWER_LEVELS[1].cost) * TOWER_SELL_REFUND_RATIO));
  });
});
