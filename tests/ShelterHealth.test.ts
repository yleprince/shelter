import { describe, expect, it } from 'vitest';
import { SHELTER_REPAIR_AMOUNT, SHELTER_REPAIR_BASE_COST, SHELTER_REPAIR_COST_PER_WAVE } from '../src/config';
import { Economy } from '../src/systems/Economy';
import { ShelterHealth, repairCost } from '../src/systems/ShelterHealth';

describe('ShelterHealth', () => {
  it('scales repair cost with the wave', () => {
    expect(repairCost(0)).toBe(SHELTER_REPAIR_BASE_COST);
    expect(repairCost(7)).toBe(SHELTER_REPAIR_BASE_COST + 7 * SHELTER_REPAIR_COST_PER_WAVE);
  });

  it('repairs and charges, clamped at max HP', () => {
    const health = new ShelterHealth(100);
    const economy = new Economy(1000);
    health.takeDamage(SHELTER_REPAIR_AMOUNT + 3);
    expect(health.tryRepair(5, economy)).toBe(true);
    expect(health.hp).toBe(100 - 3);
    expect(economy.balance).toBe(1000 - repairCost(5));
    expect(health.tryRepair(5, economy)).toBe(true);
    expect(health.hp).toBe(100);
  });

  it('is blocked when full or unaffordable, without charging', () => {
    const health = new ShelterHealth(100);
    const economy = new Economy(1000);
    expect(health.repairBlocker(0, economy.balance)).toBe('full');
    expect(health.tryRepair(0, economy)).toBe(false);
    expect(economy.balance).toBe(1000);

    health.takeDamage(30);
    const poor = new Economy(repairCost(3) - 1);
    expect(health.repairBlocker(3, poor.balance)).toBe('too-expensive');
    expect(health.tryRepair(3, poor)).toBe(false);
    expect(health.hp).toBe(70);
  });

  it('is destroyed at zero HP', () => {
    const health = new ShelterHealth(10);
    health.takeDamage(25);
    expect(health.hp).toBe(0);
    expect(health.isDestroyed).toBe(true);
  });
});
