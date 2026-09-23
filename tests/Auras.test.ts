import { describe, expect, it } from 'vitest';
import type { HealAura, JamAura, WarAura } from '../src/data/specialEnemies';
import { computeAuras, type AuraEnemy } from '../src/systems/Auras';

const heal: HealAura = { radius: 80, ratioPerSec: 0.03 };
const jam: JamAura = { radius: 100, cooldownMultiplier: 2 };
const war: WarAura = { radius: 120, speedMultiplier: 1.3, damageTakenMultiplier: 0.7 };

describe('heal aura', () => {
  it('heals other non-boss enemies in range', () => {
    const enemies: AuraEnemy[] = [{ x: 0, y: 0, healAura: heal }, { x: 80, y: 0 }, { x: 81, y: 0 }, { x: 10, y: 0, boss: true }];
    expect(computeAuras(enemies, []).healRatioPerSec).toEqual([0, 0.03, 0, 0]);
  });

  it("doesn't heal healers, itself included", () => {
    const enemies: AuraEnemy[] = [{ x: 0, y: 0, healAura: heal }, { x: 10, y: 0, healAura: heal }];
    expect(computeAuras(enemies, []).healRatioPerSec).toEqual([0, 0]);
  });

  it("doesn't stack: the strongest applies", () => {
    const strong: HealAura = { radius: 80, ratioPerSec: 0.05 };
    const enemies: AuraEnemy[] = [{ x: 0, y: 0, healAura: heal }, { x: 20, y: 0, healAura: strong }, { x: 10, y: 0 }];
    expect(computeAuras(enemies, []).healRatioPerSec[2]).toBe(0.05);
  });
});

describe('jam aura', () => {
  it('slows towers in range, without stacking', () => {
    const enemies: AuraEnemy[] = [{ x: 0, y: 0, jamAura: jam }, { x: 5, y: 0, jamAura: jam }];
    const towers = [{ x: 100, y: 0 }, { x: 0, y: 101 }];
    expect(computeAuras(enemies, towers).cooldownMultiplier).toEqual([2, 1]);
  });
});

describe('war aura', () => {
  it('buffs other enemies in range, bosses included, but not the warlord itself', () => {
    const enemies: AuraEnemy[] = [{ x: 0, y: 0, warAura: war, boss: true }, { x: 120, y: 0 }, { x: 0, y: 121 }, { x: 5, y: 5, boss: true }];
    expect(computeAuras(enemies, []).war).toEqual([undefined, war, undefined, war]);
  });

  it('lets two warlords buff each other', () => {
    const enemies: AuraEnemy[] = [{ x: 0, y: 0, warAura: war }, { x: 10, y: 0, warAura: war }];
    expect(computeAuras(enemies, []).war).toEqual([war, war]);
  });
});
