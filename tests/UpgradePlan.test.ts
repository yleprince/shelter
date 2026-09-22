import { describe, expect, it } from 'vitest';
import { nextLevelBlocker, planUpgrade, type UpgradeStep } from '../src/systems/UpgradePlan';

const LEVELS: UpgradeStep[] = [
  { cost: 50, unlockWave: 1 },
  { cost: 60, unlockWave: 1 },
  { cost: 100, unlockWave: 5 },
  { cost: 160, unlockWave: 10 },
  { cost: 250, unlockWave: 15 },
  { cost: 380, unlockWave: 20 },
];

describe('planUpgrade', () => {
  it('stops at the first locked level', () => {
    // The spec's example: a Lv2 tower at wave 12 with 400 scrap.
    expect(planUpgrade(LEVELS, 2, 12, 400)).toEqual({ targetLevel: 4, cost: 260 });
  });

  it('stops at the first level the running total cannot afford', () => {
    expect(planUpgrade(LEVELS, 1, 100, 60 + 100 + 159)).toEqual({ targetLevel: 3, cost: 160 });
  });

  it('never skips an unaffordable level to take a cheaper one after it', () => {
    const levels: UpgradeStep[] = [
      { cost: 0, unlockWave: 0 },
      { cost: 500, unlockWave: 0 },
      { cost: 1, unlockWave: 0 },
    ];
    expect(planUpgrade(levels, 1, 10, 100)).toEqual({ blocker: 'too-expensive' });
  });

  it('takes every level with an exact balance', () => {
    const total = LEVELS.slice(1).reduce((sum, l) => sum + l.cost, 0);
    expect(planUpgrade(LEVELS, 1, 100, total)).toEqual({ targetLevel: LEVELS.length, cost: total });
  });

  it('returns the next level blocker when no level can be taken', () => {
    expect(planUpgrade(LEVELS, LEVELS.length, 100, 10_000)).toEqual({ blocker: 'max-level' });
    expect(planUpgrade(LEVELS, 2, 4, 10_000)).toEqual({ blocker: 'locked' });
    expect(planUpgrade(LEVELS, 2, 100, 99)).toEqual({ blocker: 'too-expensive' });
  });
});

describe('nextLevelBlocker', () => {
  it('checks max level, then the unlock wave, then the cost', () => {
    expect(nextLevelBlocker(LEVELS, LEVELS.length, 0, 0)).toBe('max-level');
    expect(nextLevelBlocker(LEVELS, 2, 4, 0)).toBe('locked');
    expect(nextLevelBlocker(LEVELS, 2, 5, 99)).toBe('too-expensive');
    expect(nextLevelBlocker(LEVELS, 2, 5, 100)).toBeNull();
  });
});
