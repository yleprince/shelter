import { describe, expect, it } from 'vitest';
import { killScoreMultiplier, TILE_TYPE_ORDER, TILE_TYPES } from '../src/data/tileTypes';

describe('tile types', () => {
  it('has unique edit keys', () => {
    const keys = TILE_TYPE_ORDER.map((type) => TILE_TYPES[type].editKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('makes ground the only non-walkable type', () => {
    expect(TILE_TYPE_ORDER.filter((type) => !TILE_TYPES[type].walkable)).toEqual(['ground']);
  });

  it('has positive speed multipliers and non-negative costs and unlock waves', () => {
    for (const type of TILE_TYPE_ORDER) {
      const def = TILE_TYPES[type];
      expect(def.speedMultiplier).toBeGreaterThan(0);
      expect(def.editBaseCost).toBeGreaterThanOrEqual(0);
      expect(def.unlockWave).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps the initial map tiles available from the start', () => {
    for (const type of ['path', 'gravel', 'ground'] as const) expect(TILE_TYPES[type].unlockWave).toBe(0);
  });

  it('gives only fire a damage effect, at normal speed', () => {
    expect(TILE_TYPE_ORDER.filter((type) => TILE_TYPES[type].damagePerSec)).toEqual(['fire']);
    expect(TILE_TYPES.fire.speedMultiplier).toBe(1);
  });

  it('makes ice available from the start, with a kill score bonus', () => {
    expect(TILE_TYPES.ice.unlockWave).toBe(0);
    expect(killScoreMultiplier('ice')).toBe(5);
  });

  it('has no kill score bonus elsewhere', () => {
    for (const type of TILE_TYPE_ORDER.filter((t) => t !== 'ice')) expect(killScoreMultiplier(type)).toBe(1);
    expect(killScoreMultiplier(undefined)).toBe(1);
  });
});
