import { describe, expect, it } from 'vitest';
import { Economy } from '../src/systems/Economy';

describe('Economy', () => {
  it('spends when affordable and refuses otherwise', () => {
    const economy = new Economy(100);
    expect(economy.spend(60)).toBe(true);
    expect(economy.balance).toBe(40);
    expect(economy.spend(50)).toBe(false);
    expect(economy.balance).toBe(40);
  });

  it('earns currency', () => {
    const economy = new Economy(0);
    economy.earn(15);
    expect(economy.canAfford(15)).toBe(true);
    expect(economy.balance).toBe(15);
  });
});
