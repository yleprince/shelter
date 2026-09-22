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

  it('goes up to Lv8', () => {
    expect(TOWER_LEVELS).toHaveLength(8);
    expect(TOWER_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('upgrades through every level, charging each cost and switching stats', () => {
    const tower = new TowerProgress();
    const economy = new Economy(100_000);
    for (const next of TOWER_LEVELS.slice(1)) {
      expect(tower.upgrade(next.unlockWave, economy)).toBe(true);
      expect(tower.stats).toBe(next);
    }
    const upgradeCosts = TOWER_LEVELS.slice(1).reduce((sum, l) => sum + l.cost, 0);
    expect(economy.balance).toBe(100_000 - upgradeCosts);
    expect(tower.totalInvested).toBe(TOWER_LEVELS.reduce((sum, l) => sum + l.cost, 0));
    expect(tower.level).toBe(TOWER_LEVELS.length);
    expect(tower.upgradeBlocker(100, 10_000)).toBe('max-level');
    expect(tower.upgrade(100, economy)).toBe(false);
  });

  it('is gated by wave, then by cost, without charging when blocked', () => {
    const tower = new TowerProgress();
    const economy = new Economy(100_000);
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

  it('max upgrades in one charge, investing the same as step by step', () => {
    const wave = TOWER_LEVELS[4].unlockWave;
    const stepped = new TowerProgress();
    const steppedEconomy = new Economy(100_000);
    while (stepped.upgrade(wave, steppedEconomy));

    const maxed = new TowerProgress();
    const economy = new Economy(100_000);
    expect(maxed.maxUpgrade(wave, economy)).toBe(true);
    expect(maxed.level).toBe(stepped.level);
    expect(maxed.stats).toBe(TOWER_LEVELS[4]);
    expect(maxed.totalInvested).toBe(stepped.totalInvested);
    expect(maxed.sellValue).toBe(stepped.sellValue);
    expect(economy.balance).toBe(steppedEconomy.balance);
  });

  it('max upgrade charges nothing when the next level is blocked', () => {
    const tower = new TowerProgress();
    const economy = new Economy(TOWER_LEVELS[1].cost - 1);
    expect(tower.maxUpgrade(100, economy)).toBe(false);
    expect(economy.balance).toBe(TOWER_LEVELS[1].cost - 1);
    expect(tower.level).toBe(1);
  });
});
