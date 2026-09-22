import { describe, expect, it } from 'vitest';
import { POINTS_PER_KILL, POINTS_PER_SAVED_CURRENCY, SURVIVAL_POINTS_PER_SEC } from '../src/config';
import { ScoreManager } from '../src/systems/ScoreManager';

describe('ScoreManager', () => {
  const played = () => {
    const score = new ScoreManager();
    score.tick(61_500);
    score.addKill();
    score.addKill();
    return score;
  };
  const subtotal =
    Math.floor(61 * SURVIVAL_POINTS_PER_SEC) +
    Math.floor(2 * POINTS_PER_KILL) +
    Math.floor(80 * POINTS_PER_SAVED_CURRENCY);

  it('combines survival time, kills and saved currency', () => {
    const final = played().computeFinal(80, 1);
    expect(final.survivalSeconds).toBe(61);
    expect(final.kills).toBe(2);
    expect(final.subtotal).toBe(subtotal);
    expect(final.total).toBe(subtotal);
  });

  it('applies the map multiplier to the whole subtotal, rounding down', () => {
    const final = played().computeFinal(80, 1.25);
    expect(final.mapMultiplier).toBe(1.25);
    expect(final.total).toBe(Math.floor(subtotal * 1.25));
    expect(Number.isInteger(final.total)).toBe(true);
  });
});
