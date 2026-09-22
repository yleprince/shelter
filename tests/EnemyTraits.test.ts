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
import { armoredDamage, terrainSpeedMultiplier } from '../src/systems/EnemyTraits';
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

describe('terrain speed', () => {
  it('slows on gravel unless the enemy ignores it', () => {
    expect(terrainSpeedMultiplier('gravel', false)).toBe(TILE_TYPES.gravel.speedMultiplier);
    expect(terrainSpeedMultiplier('gravel', true)).toBe(1);
    expect(terrainSpeedMultiplier('path', false)).toBe(1);
    expect(terrainSpeedMultiplier(undefined, false)).toBe(1);
  });

  it('slows everyone on water, runners included', () => {
    expect(terrainSpeedMultiplier('water', false)).toBe(TILE_TYPES.water.speedMultiplier);
    expect(terrainSpeedMultiplier('water', true)).toBe(TILE_TYPES.water.speedMultiplier);
    expect(TILE_TYPES.water.speedMultiplier).toBeLessThan(TILE_TYPES.gravel.speedMultiplier);
  });
});

describe('special specs', () => {
  it('scale per wave like tiers and carry their trait', () => {
    const runner = specialSpec(special('runner'), 8);
    expect(runner.hp).toBe(scaledHp(special('runner').hp, 8));
    expect(runner.speed).toBe(scaledSpeed(special('runner').speed, 8));
    expect(runner.reward).toBe(special('runner').reward + 8 * ENEMY_KILL_REWARD_PER_WAVE);
    expect(runner.ignoresGravel).toBe(true);
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
