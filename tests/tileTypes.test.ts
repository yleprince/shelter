import { describe, expect, it } from 'vitest';
import { TILE_TYPE_ORDER, TILE_TYPES } from '../src/data/tileTypes';

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
});
