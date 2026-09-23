import { describe, expect, it } from 'vitest';
import {
  ARMOR_MIN_DAMAGE,
  ARMORED_ARMOR,
  ENEMY_KILL_REWARD_PER_WAVE,
  SPLITTER_CHILD_COUNT,
  SPLITTER_CHILD_REWARD_RATIO,
} from '../src/config';
import { ENEMY_TIERS } from '../src/data/enemyTiers';
import { SPECIAL_ENEMIES } from '../src/data/specialEnemies';
import { TILE_TYPES } from '../src/data/tileTypes';
import { BOSSES } from '../src/data/bosses';
import {
  armoredDamage,
  damageTaken,
  terrainDamage,
  terrainDamagePerSec,
  terrainSpeedMultiplier,
} from '../src/systems/EnemyTraits';
import { scaledHp, scaledSpeed, specialSpec, splitterChildren } from '../src/systems/WaveComposer';

const special = (id: string) => SPECIAL_ENEMIES.find((s) => s.id === id)!;

describe('armor', () => {
  it('subtracts flat armor from each hit, down to the minimum', () => {
    expect(armoredDamage(10, ARMORED_ARMOR)).toBe(10 - ARMORED_ARMOR);
    expect(armoredDamage(16, ARMORED_ARMOR)).toBe(16 - ARMORED_ARMOR);
    expect(armoredDamage(5, ARMORED_ARMOR)).toBe(ARMOR_MIN_DAMAGE);
    expect(armoredDamage(ARMORED_ARMOR, ARMORED_ARMOR)).toBe(ARMOR_MIN_DAMAGE);
  });

  it('leaves unarmored enemies alone', () => {
    expect(armoredDamage(5, 0)).toBe(5);
  });
});

const runnerImmune = special('runner').traits.slowImmune;
const swimmerImmune = special('swimmer').traits.slowImmune;

describe('terrain speed', () => {
  it('slows on gravel unless the enemy is immune to it', () => {
    expect(terrainSpeedMultiplier('gravel')).toBe(TILE_TYPES.gravel.speedMultiplier);
    expect(terrainSpeedMultiplier('gravel', runnerImmune)).toBe(1);
    expect(terrainSpeedMultiplier('path')).toBe(1);
    expect(terrainSpeedMultiplier(undefined)).toBe(1);
  });

  it('slows runners on water, but not swimmers or the leviathan', () => {
    expect(terrainSpeedMultiplier('water')).toBe(TILE_TYPES.water.speedMultiplier);
    expect(terrainSpeedMultiplier('water', runnerImmune)).toBe(TILE_TYPES.water.speedMultiplier);
    expect(terrainSpeedMultiplier('water', swimmerImmune)).toBe(1);
    expect(terrainSpeedMultiplier('gravel', swimmerImmune)).toBe(1);
    expect(BOSSES.find((b) => b.id === 'leviathan')!.traits.slowImmune).toEqual(['gravel', 'water']);
    expect(TILE_TYPES.water.speedMultiplier).toBeLessThan(TILE_TYPES.gravel.speedMultiplier);
  });

  it('speeds everyone up on ice, immune enemies included', () => {
    expect(terrainSpeedMultiplier('ice')).toBe(TILE_TYPES.ice.speedMultiplier);
    expect(terrainSpeedMultiplier('ice', runnerImmune)).toBe(TILE_TYPES.ice.speedMultiplier);
    expect(terrainSpeedMultiplier('ice', swimmerImmune)).toBe(TILE_TYPES.ice.speedMultiplier);
    expect(TILE_TYPES.ice.speedMultiplier).toBeGreaterThan(1);
  });
});

describe('war aura damage', () => {
  it('scales damage taken', () => {
    expect(damageTaken(100, 0.7)).toBeCloseTo(70);
    expect(damageTaken(100, 1)).toBe(100);
  });
});

describe('terrain damage', () => {
  it('scales fire damage per second with the wave: 200 + 20 × wave', () => {
    expect(terrainDamagePerSec('fire', 0)).toBe(200);
    expect(terrainDamagePerSec('fire', 250)).toBe(5200);
  });

  it('deals the per-second damage pro rata to the step', () => {
    expect(terrainDamage('fire', 250, 1000)).toBe(5200);
    expect(terrainDamage('fire', 250, 16)).toBeCloseTo(5200 * 0.016);
  });

  it('deals nothing off fire', () => {
    for (const type of ['path', 'gravel', 'water', 'ice', 'ground'] as const) expect(terrainDamage(type, 250, 16)).toBe(0);
    expect(terrainDamage(undefined, 250, 16)).toBe(0);
  });

  it('leaves fire speed and routing alone', () => {
    expect(terrainSpeedMultiplier('fire')).toBe(1);
  });

  it('spares fireproof enemies', () => {
    expect(terrainDamagePerSec('fire', 250, true)).toBe(0);
    expect(terrainDamage('fire', 250, 16, true)).toBe(0);
    expect(specialSpec(special('salamander'), 260).fireproof).toBe(true);
  });
});

describe('special specs', () => {
  it('scale per wave like tiers and carry their trait', () => {
    const runner = specialSpec(special('runner'), 8);
    expect(runner.hp).toBe(scaledHp(special('runner').hp, 8));
    expect(runner.speed).toBe(scaledSpeed(special('runner').speed, 8));
    expect(runner.reward).toBe(special('runner').reward + 8 * ENEMY_KILL_REWARD_PER_WAVE);
    expect(runner.slowImmune).toEqual(['gravel']);
    expect(runner.armor).toBeUndefined();

    const armored = specialSpec(special('armored'), 30);
    expect(armored.armor).toBe(ARMORED_ARMOR);
    expect(armored.splitsInto).toBeUndefined();
  });

  it('caps the runner at the usual speed multiplier', () => {
    expect(specialSpec(special('runner'), 500).speed).toBe(220);
  });

  it('gives a splitter T1-based children worth a share of the T1 reward', () => {
    const splitter = specialSpec(special('splitter'), 14);
    expect(splitter.splitsInto).toEqual(splitterChildren(14));
    const children = splitterChildren(14);
    const t1 = ENEMY_TIERS[0];
    expect(children).toHaveLength(SPLITTER_CHILD_COUNT);
    for (const child of children) {
      expect(child.kind).toBe('T1');
      expect(child.hp).toBe(scaledHp(t1.hp, 14));
      expect(child.speed).toBe(scaledSpeed(t1.speed, 14));
      expect(child.reward).toBe(Math.floor((t1.reward + 14 * ENEMY_KILL_REWARD_PER_WAVE) * SPLITTER_CHILD_REWARD_RATIO));
      expect(child.splitsInto).toBeUndefined();
      expect(child.scale).toBeLessThan(1);
    }
  });
});

describe('new special specs', () => {
  it('carry their aura, burrow and revive data', () => {
    expect(specialSpec(special('healer'), 180).healAura).toEqual({ radius: 80, ratioPerSec: 0.03 });
    expect(specialSpec(special('jammer'), 200).jamAura).toEqual({ radius: 100, cooldownMultiplier: 2 });
    expect(specialSpec(special('burrower'), 210).burrow).toEqual({ surfaceMs: 3000, undergroundMs: 2000 });
  });

  it('gives a carrier five drops of two T1-based minions', () => {
    const carrier = specialSpec(special('carrier'), 230);
    const t1 = ENEMY_TIERS[0];
    expect(carrier.spawner).toMatchObject({ everyMs: 4000, maxTimes: 5 });
    expect(carrier.spawner!.children).toHaveLength(2);
    for (const child of carrier.spawner!.children) {
      expect(child.kind).toBe('T1');
      expect(child.hp).toBe(scaledHp(t1.hp, 230));
      expect(child.reward).toBe(Math.floor((t1.reward + 230 * ENEMY_KILL_REWARD_PER_WAVE) * SPLITTER_CHILD_REWARD_RATIO));
      expect(child.spawner).toBeUndefined();
    }
  });
});
