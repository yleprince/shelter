import { describe, expect, it } from 'vitest';
import {
  BOSS_CONTACT_DAMAGE,
  BOSS_HP_MULTIPLIER,
  BOSS_REWARD,
  BOSS_SPEED_MULTIPLIER,
  ENEMY_KILL_REWARD_PER_WAVE,
  SPECIAL_SHARE,
  WAVE_SPEED_MAX_MULTIPLIER,
} from '../src/config';
import { ENEMY_TIERS } from '../src/data/enemyTiers';
import { SPECIAL_ENEMIES } from '../src/data/specialEnemies';
import {
  activeSpecials,
  activeTiers,
  composeWave,
  interleave,
  isBossWave,
  scaledHp,
  scaledSpeed,
  tierCounts,
  waveEnemyCount,
  type EnemySpec,
} from '../src/systems/WaveComposer';

const ids = (wave: number) => activeTiers(wave).map((t) => t.id);
const TIER_ORDER: string[] = ENEMY_TIERS.map((t) => t.id);
const SPECIAL_IDS: string[] = SPECIAL_ENEMIES.map((s) => s.id);
const isSpecial = (s: EnemySpec) => SPECIAL_IDS.includes(s.kind);
const isTier = (s: EnemySpec) => TIER_ORDER.includes(s.kind);

describe('activeTiers', () => {
  it('brings tiers in and retires them by wave', () => {
    expect(ids(1)).toEqual(['T1']);
    expect(ids(3)).toEqual(['T1']);
    expect(ids(4)).toEqual(['T1', 'T2']);
    expect(ids(7)).toEqual(['T1', 'T2', 'T3']);
    expect(ids(13)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(ids(14)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
    expect(ids(15)).toEqual(['T2', 'T3', 'T4', 'T5']);
    expect(ids(17)).toEqual(['T2', 'T3', 'T4', 'T5', 'T6']);
    expect(ids(25)).toEqual(['T3', 'T4', 'T5', 'T6', 'T7']);
    expect(ids(26)).toEqual(['T3', 'T4', 'T5', 'T6', 'T7', 'T8']);
    expect(ids(30)).toEqual(['T4', 'T5', 'T6', 'T7', 'T8']);
    expect(ids(35)).toEqual(['T5', 'T6', 'T7', 'T8']);
    expect(ids(500)).toEqual(['T5', 'T6', 'T7', 'T8']);
  });
});

describe('activeSpecials', () => {
  it('brings specials in by wave and never retires them', () => {
    const specialIds = (wave: number) => activeSpecials(wave).map((s) => s.id);
    expect(specialIds(5)).toEqual([]);
    expect(specialIds(6)).toEqual(['runner']);
    expect(specialIds(9)).toEqual(['runner', 'armored']);
    expect(specialIds(12)).toEqual(['runner', 'armored', 'splitter']);
    expect(specialIds(500)).toEqual(['runner', 'armored', 'splitter']);
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

describe('interleave', () => {
  it('spreads extras evenly and keeps both orders', () => {
    expect(interleave<number | string>([1, 2, 3, 4, 5, 6], ['a', 'b'])).toEqual([1, 2, 'a', 3, 4, 5, 'b', 6]);
    expect(interleave([1, 2], [])).toEqual([1, 2]);
    expect(interleave<string>([], ['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('composeWave', () => {
  it('keeps the formula count, with tiers in ascending order', () => {
    for (const wave of [1, 4, 6, 8, 13, 19, 27, 33, 41]) {
      const queue = composeWave(wave);
      expect(queue).toHaveLength(waveEnemyCount(wave));
      const order = queue.filter(isTier).map((s) => TIER_ORDER.indexOf(s.kind));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it('takes a rounded-up share of the wave for each active special', () => {
    for (const wave of [6, 9, 12, 27]) {
      const queue = composeWave(wave);
      const share = Math.ceil(waveEnemyCount(wave) * SPECIAL_SHARE);
      for (const special of activeSpecials(wave)) {
        expect(queue.filter((s) => s.kind === special.id)).toHaveLength(share);
      }
      expect(queue.filter(isSpecial)).toHaveLength(share * activeSpecials(wave).length);
    }
    expect(composeWave(5).filter(isSpecial)).toHaveLength(0);
  });

  it('spreads specials through the wave instead of spawning them as a block', () => {
    const queue = composeWave(12);
    const positions = queue.flatMap((s, i) => (isSpecial(s) ? [i] : []));
    const gaps = positions.slice(1).map((p, i) => p - positions[i]);
    expect(Math.min(...gaps)).toBeGreaterThan(1);
    expect(positions[0]).toBeGreaterThan(0);
    expect(positions.at(-1)).toBeLessThan(queue.length - 1);
    // Kinds alternate rather than bunching up.
    const kinds = queue.filter(isSpecial).map((s) => s.kind);
    expect(kinds.slice(0, 3)).toEqual(['runner', 'armored', 'splitter']);
  });

  it('is deterministic', () => {
    expect(composeWave(23)).toEqual(composeWave(23));
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

  it('adds a boss last on every 10th wave, with half the escorts rounded up, specials included', () => {
    expect([9, 10, 11, 20, 30].map(isBossWave)).toEqual([false, true, false, true, true]);
    for (const wave of [10, 20, 30]) {
      const queue = composeWave(wave);
      const escorts = Math.ceil(waveEnemyCount(wave) / 2);
      expect(queue).toHaveLength(escorts + 1);
      expect(queue.filter((s) => s.kind === 'boss')).toHaveLength(1);
      expect(queue[queue.length - 1].kind).toBe('boss');
      expect(queue.filter(isSpecial)).toHaveLength(Math.ceil(escorts * SPECIAL_SHARE) * activeSpecials(wave).length);
    }
  });

  it('builds the boss from the strongest active tier and T1 speed', () => {
    const boss = composeWave(10).at(-1)!;
    const t4 = ENEMY_TIERS[3];
    expect(boss.hp).toBe(BOSS_HP_MULTIPLIER * scaledHp(t4.hp, 10));
    expect(boss.speed).toBe(BOSS_SPEED_MULTIPLIER * scaledSpeed(ENEMY_TIERS[0].speed, 10));
    expect(boss.damage).toBe(BOSS_CONTACT_DAMAGE);
    expect(boss.reward).toBe(BOSS_REWARD);
    expect(boss.armor).toBeUndefined();
  });

  it('builds the wave 30 boss from T8', () => {
    const t8 = ENEMY_TIERS[7];
    expect(composeWave(30).at(-1)!.hp).toBe(BOSS_HP_MULTIPLIER * scaledHp(t8.hp, 30));
  });
});
