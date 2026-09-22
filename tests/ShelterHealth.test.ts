import { describe, expect, it } from 'vitest';
import { SHELTER_REPAIR_BASE_COST, SHELTER_REPAIR_COST_PER_WAVE, SHELTER_REPAIR_RATIO } from '../src/config';
import { SHELTER_LEVELS } from '../src/data/shelterLevels';
import { Economy } from '../src/systems/Economy';
import { ShelterHealth, repairCost } from '../src/systems/ShelterHealth';

const LV1_HP = SHELTER_LEVELS[0].maxHp;

describe('ShelterHealth', () => {
  it('starts at Lv1 with full HP', () => {
    const health = new ShelterHealth();
    expect(health.level).toBe(1);
    expect(health.hp).toBe(LV1_HP);
    expect(health.maxHp).toBe(LV1_HP);
  });

  it('scales repair cost with the wave', () => {
    expect(repairCost(0)).toBe(SHELTER_REPAIR_BASE_COST);
    expect(repairCost(7)).toBe(SHELTER_REPAIR_BASE_COST + 7 * SHELTER_REPAIR_COST_PER_WAVE);
  });

  it('repairs a share of max HP and charges, clamped at max HP', () => {
    const health = new ShelterHealth();
    const economy = new Economy(1000);
    const amount = Math.round(LV1_HP * SHELTER_REPAIR_RATIO);
    expect(health.repairAmount).toBe(amount);
    health.takeDamage(amount + 3);
    expect(health.tryRepair(5, economy)).toBe(true);
    expect(health.hp).toBe(LV1_HP - 3);
    expect(economy.balance).toBe(1000 - repairCost(5));
    expect(health.tryRepair(5, economy)).toBe(true);
    expect(health.hp).toBe(LV1_HP);
  });

  it('is blocked when full or unaffordable, without charging', () => {
    const health = new ShelterHealth();
    const economy = new Economy(1000);
    expect(health.repairBlocker(0, economy.balance)).toBe('full');
    expect(health.tryRepair(0, economy)).toBe(false);
    expect(economy.balance).toBe(1000);

    health.takeDamage(30);
    const poor = new Economy(repairCost(3) - 1);
    expect(health.repairBlocker(3, poor.balance)).toBe('too-expensive');
    expect(health.tryRepair(3, poor)).toBe(false);
    expect(health.hp).toBe(LV1_HP - 30);
  });

  it('is destroyed at zero HP', () => {
    const health = new ShelterHealth();
    health.takeDamage(LV1_HP + 25);
    expect(health.hp).toBe(0);
    expect(health.isDestroyed).toBe(true);
  });
});

describe('ShelterHealth upgrades', () => {
  it('adds the max HP gained to current HP instead of healing fully', () => {
    const health = new ShelterHealth();
    const economy = new Economy(100_000);
    health.tryUpgrade(SHELTER_LEVELS[1].unlockWave, economy);
    health.takeDamage(health.maxHp - 40);
    expect(health.tryUpgrade(SHELTER_LEVELS[2].unlockWave, economy)).toBe(true);
    expect(health.level).toBe(3);
    expect(health.maxHp).toBe(SHELTER_LEVELS[2].maxHp);
    expect(health.hp).toBe(40 + SHELTER_LEVELS[2].maxHp - SHELTER_LEVELS[1].maxHp);
  });

  it('charges each level cost and stops at max level', () => {
    const health = new ShelterHealth();
    const economy = new Economy(100_000);
    for (const next of SHELTER_LEVELS.slice(1)) {
      expect(health.upgradeCost()).toBe(next.cost);
      expect(health.tryUpgrade(next.unlockWave, economy)).toBe(true);
    }
    const total = SHELTER_LEVELS.reduce((sum, l) => sum + l.cost, 0);
    expect(economy.balance).toBe(100_000 - total);
    expect(health.upgradeCost()).toBeUndefined();
    expect(health.upgradeBlocker(1000, economy.balance)).toBe('max-level');
    expect(health.tryUpgrade(1000, economy)).toBe(false);
  });

  it('is gated by wave, then by cost, without charging when blocked', () => {
    const health = new ShelterHealth();
    const lv2 = SHELTER_LEVELS[1];
    const economy = new Economy(lv2.cost);
    expect(health.upgradeBlocker(lv2.unlockWave - 1, economy.balance)).toBe('locked');
    expect(health.tryUpgrade(lv2.unlockWave - 1, economy)).toBe(false);
    const poor = new Economy(lv2.cost - 1);
    expect(health.upgradeBlocker(lv2.unlockWave, poor.balance)).toBe('too-expensive');
    expect(health.tryUpgrade(lv2.unlockWave, poor)).toBe(false);
    expect(economy.balance).toBe(lv2.cost);
    expect(poor.balance).toBe(lv2.cost - 1);
    expect(health.level).toBe(1);
  });

  it('repairs more HP at a higher level for the same cost', () => {
    const health = new ShelterHealth();
    health.tryUpgrade(100, new Economy(100_000));
    expect(health.repairAmount).toBe(Math.round(SHELTER_LEVELS[1].maxHp * SHELTER_REPAIR_RATIO));
  });

  it('max upgrade adds the HP of every level taken, charged once', () => {
    const health = new ShelterHealth();
    health.takeDamage(60);
    const economy = new Economy(SHELTER_LEVELS[1].cost + SHELTER_LEVELS[2].cost + 1);
    expect(health.maxUpgrade(1000, economy)).toBe(true);
    expect(health.level).toBe(3);
    expect(health.hp).toBe(LV1_HP - 60 + SHELTER_LEVELS[2].maxHp - LV1_HP);
    expect(economy.balance).toBe(1);
  });

  it('max upgrade does nothing when the next level is blocked', () => {
    const health = new ShelterHealth();
    const economy = new Economy(100_000);
    expect(health.upgradePlan(0, economy.balance)).toEqual({ blocker: 'locked' });
    expect(health.maxUpgrade(0, economy)).toBe(false);
    expect(economy.balance).toBe(100_000);
  });
});
