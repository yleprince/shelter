import { describe, expect, it } from 'vitest';
import { POINTS_PER_KILL, POINTS_PER_SAVED_CURRENCY, SURVIVAL_POINTS_PER_SEC } from '../src/config';
import { ScoreManager } from '../src/systems/ScoreManager';

describe('ScoreManager', () => {
  it('combines survival time, kills and saved currency', () => {
    const score = new ScoreManager();
    score.tick(61_500);
    score.addKill();
    score.addKill();
    const final = score.computeFinal(80);
    expect(final.survivalSeconds).toBe(61);
    expect(final.kills).toBe(2);
    expect(final.total).toBe(
      Math.floor(61 * SURVIVAL_POINTS_PER_SEC) +
        Math.floor(2 * POINTS_PER_KILL) +
        Math.floor(80 * POINTS_PER_SAVED_CURRENCY),
    );
  });
});
