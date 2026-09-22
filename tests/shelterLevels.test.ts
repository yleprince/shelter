import { describe, expect, it } from 'vitest';
import { SHELTER_LEVELS } from '../src/data/shelterLevels';
import { SHELTER_TEXTURES } from '../src/data/textures';

describe('SHELTER_LEVELS', () => {
  it('numbers levels from 1 in order', () => {
    expect(SHELTER_LEVELS.map((l) => l.level)).toEqual(SHELTER_LEVELS.map((_, i) => i + 1));
  });

  it('makes Lv1 free and available from the start', () => {
    expect(SHELTER_LEVELS[0].cost).toBe(0);
    expect(SHELTER_LEVELS[0].unlockWave).toBe(0);
  });

  it('strictly increases max HP, cost and unlock wave', () => {
    for (let i = 1; i < SHELTER_LEVELS.length; i++) {
      const [prev, cur] = [SHELTER_LEVELS[i - 1], SHELTER_LEVELS[i]];
      expect(cur.maxHp).toBeGreaterThan(prev.maxHp);
      expect(cur.cost).toBeGreaterThan(prev.cost);
      expect(cur.unlockWave).toBeGreaterThan(prev.unlockWave);
    }
  });

  it('has one texture per level', () => {
    expect(SHELTER_TEXTURES).toHaveLength(SHELTER_LEVELS.length);
  });
});
