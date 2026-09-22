import { describe, expect, it } from 'vitest';
import {
  BOSS_CONTACT_DAMAGE,
  BOSS_HP_MULTIPLIER,
  BOSS_REWARD,
  BOSS_SPEED_MULTIPLIER,
  ENEMY_KILL_REWARD_PER_WAVE,
  WAVE_SPEED_MAX_MULTIPLIER,
} from '../src/config';
import { ENEMY_TIERS } from '../src/data/enemyTiers';
import {
  activeTiers,
  composeWave,
  isBossWave,
  scaledHp,
  scaledSpeed,
  tierCounts,
  waveEnemyCount,
} from '../src/systems/WaveComposer';

const ids = (wave: number) => activeTiers(wave).map((t) => t.id);
const TIER_ORDER = ['T1', 'T2', 'T3', 'T4', 'T5'];

describe('activeTiers', () => {
  it('brings tiers in and retires them by wave', () => {
    expect(ids(1)).toEqual(['T1']);
    expect(ids(3)).toEqual(['T1']);
    expect(ids(4)).toEqual(['T1', 'T2']);
    expect(ids(7)).toEqual(['T1', 'T2', 'T3']);
    expect(ids(13)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(ids(14)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(ids(15)).toEqual(['T2', 'T3', 'T4', 'T5']);
    expect(ids(25)).toEqual(['T3', 'T4', 'T5']);
    expect(ids(500)).toEqual(['T3', 'T4', 'T5']);
  });
});

describe('tierCounts', () => {
  it('splits evenly and gives the remainder to the weakest tiers', () => {
    const counts = [...tierCounts(7, 11).entries()].map(([tier, n]) => [tier.id, n]);
    expect(counts).toEqual([
      ['T1', 4],
      ['T2', 4],
      ['T3', 3],
    ]);
  });
});

describe('composeWave', () => {
  it('has the formula count, in ascending tier order', () => {
    for (const wave of [1, 4, 8, 13, 19, 27]) {
      const queue = composeWave(wave);
      expect(queue).toHaveLength(waveEnemyCount(wave));
      const order = queue.map((s) => TIER_ORDER.indexOf(s.kind));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it('scales tier stats per wave and carries the reward', () => {
    const t2 = ENEMY_TIERS[1];
    const spec = composeWave(6).find((s) => s.kind === 'T2')!;
    expect(spec.hp).toBe(scaledHp(t2.hp, 6));
    expect(spec.speed).toBe(scaledSpeed(t2.speed, 6));
    expect(spec.damage).toBe(t2.damage);
    expect(spec.reward).toBe(t2.reward + 6 * ENEMY_KILL_REWARD_PER_WAVE);
  });

  it('caps speed scaling', () => {
    expect(scaledSpeed(50, 1000)).toBe(50 * WAVE_SPEED_MAX_MULTIPLIER);
  });

  it('adds a boss last on every 10th wave, with half the escorts rounded up', () => {
    expect([9, 10, 11, 20, 30].map(isBossWave)).toEqual([false, true, false, true, true]);
    for (const wave of [10, 20, 30]) {
      const queue = composeWave(wave);
      const escorts = Math.ceil(waveEnemyCount(wave) / 2);
      expect(queue).toHaveLength(escorts + 1);
      expect(queue.filter((s) => s.kind === 'boss')).toHaveLength(1);
      expect(queue[queue.length - 1].kind).toBe('boss');
    }
  });

  it('builds the boss from the strongest active tier and T1 speed', () => {
    const boss = composeWave(10).at(-1)!;
    const t4 = ENEMY_TIERS[3];
    expect(boss.hp).toBe(BOSS_HP_MULTIPLIER * scaledHp(t4.hp, 10));
    expect(boss.speed).toBe(BOSS_SPEED_MULTIPLIER * scaledSpeed(ENEMY_TIERS[0].speed, 10));
    expect(boss.damage).toBe(BOSS_CONTACT_DAMAGE);
    expect(boss.reward).toBe(BOSS_REWARD);
  });
});
