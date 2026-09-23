import { describe, expect, it } from 'vitest';
import {
  BOSS_REWARD_PER_WAVE,
  ENEMY_KILL_REWARD_PER_WAVE,
  SPECIAL_MAX_TOTAL_SHARE,
  SPECIAL_SHARE,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_SPEED_MAX_MULTIPLIER,
} from '../src/config';
import { BOSSES } from '../src/data/bosses';
import { ENEMY_TIERS } from '../src/data/enemyTiers';
import { SPECIAL_ENEMIES } from '../src/data/specialEnemies';
import { WAVE_THEMES } from '../src/data/waveThemes';
import {
  activeSpecials,
  activeTiers,
  bossesForWave,
  bossSpec,
  composeWave,
  interleave,
  isBossWave,
  scaledHp,
  scaledSpeed,
  specialShare,
  specialSpec,
  themeForWave,
  tierCounts,
  tierSpec,
  waveEnemyCount,
  waveSpawnIntervalMs,
  type EnemySpec,
} from '../src/systems/WaveComposer';

const ids = (wave: number) => activeTiers(wave).map((t) => t.id);
const TIER_ORDER: string[] = ENEMY_TIERS.map((t) => t.id);
const SPECIAL_IDS: string[] = SPECIAL_ENEMIES.map((s) => s.id);
const isSpecial = (s: EnemySpec) => SPECIAL_IDS.includes(s.kind);
const isTier = (s: EnemySpec) => TIER_ORDER.includes(s.kind);
const isBoss = (s: EnemySpec) => s.boss === true;
const brute = BOSSES[0];
const bossIds = (wave: number) => bossesForWave(wave).map((b) => b.id);
const themeId = (wave: number) => themeForWave(wave).id;

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
    expect(specialIds(159)).toEqual(['runner', 'armored', 'splitter']);
    expect(specialIds(160)).toEqual(['runner', 'armored', 'splitter', 'swimmer']);
    expect(specialIds(500)).toEqual(SPECIAL_IDS);
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
      expect(queue.filter(isBoss)).toHaveLength(1);
      expect(queue[queue.length - 1].kind).toBe('brute');
      expect(queue.filter(isSpecial)).toHaveLength(Math.ceil(escorts * SPECIAL_SHARE) * activeSpecials(wave).length);
    }
  });

  it('builds the boss from the strongest active tier and T1 speed', () => {
    const boss = composeWave(10).at(-1)!;
    const t4 = ENEMY_TIERS[3];
    expect(boss.hp).toBe(brute.hpMultiplier * scaledHp(t4.hp, 10));
    expect(boss.speed).toBe(brute.speedMultiplier * scaledSpeed(ENEMY_TIERS[0].speed, 10));
    expect(boss.damage).toBe(brute.damage);
    expect(boss.reward).toBe(brute.reward + 10 * BOSS_REWARD_PER_WAVE);
    expect(boss.armor).toBeUndefined();
  });

  it('builds the wave 30 boss from T8', () => {
    const t8 = ENEMY_TIERS[7];
    expect(composeWave(30).at(-1)!.hp).toBe(brute.hpMultiplier * scaledHp(t8.hp, 30));
  });
});

describe('special share cap', () => {
  it('keeps 10 % each up to five specials, then splits half the wave evenly', () => {
    expect(specialShare(0)).toBe(0);
    expect(specialShare(1)).toBe(SPECIAL_SHARE);
    expect(specialShare(5)).toBe(SPECIAL_SHARE);
    expect(specialShare(9)).toBeCloseTo(SPECIAL_MAX_TOTAL_SHARE / 9);
  });

  it('leaves at least about half of a wave-261 wave to tiers', () => {
    const queue = composeWave(261);
    expect(activeSpecials(261)).toHaveLength(9);
    const share = Math.ceil(queue.length * (SPECIAL_MAX_TOTAL_SHARE / 9));
    for (const special of SPECIAL_ENEMIES) {
      expect(queue.filter((s) => s.kind === special.id).length).toBeLessThanOrEqual(share);
    }
    // Rounding up per special can pass the cap by at most one enemy each.
    expect(queue.filter(isSpecial).length).toBeLessThanOrEqual(queue.length * SPECIAL_MAX_TOTAL_SHARE + 9);
  });
});

describe('bosses', () => {
  it('debut on the boss wave equal to their appearsFrom', () => {
    expect(bossIds(10)).toEqual(['brute']);
    expect(bossIds(150)).toEqual(['hiveQueen']);
    expect(bossIds(170)).toEqual(['juggernaut']);
    expect(bossIds(190)).toEqual(['warlord']);
  });

  it('rotate deterministically between debuts', () => {
    // Wave 160: brute and hive queen active, (160 / 10) % 2 = 0.
    expect(bossIds(160)).toEqual(['brute']);
    // Wave 180: three active, (180 / 10) % 3 = 0.
    expect(bossIds(180)).toEqual(['brute']);
    expect(bossIds(140)).toEqual(['brute']);
    expect(bossesForWave(141)).toEqual([]);
  });

  it('come in pairs of different bosses from wave 200: the rotation and the next one', () => {
    // Four active at 200, (200 / 10) % 4 = 0.
    expect(bossIds(200)).toEqual(['brute', 'hiveQueen']);
    expect(bossIds(210)).toEqual(['hiveQueen', 'juggernaut']);
    // Leviathan's debut, paired with the next active boss, wrapping to the brute.
    expect(bossIds(220)).toEqual(['leviathan', 'brute']);
    expect(bossIds(250)).toEqual(['phoenix', 'brute']);
    for (let wave = 200; wave <= 400; wave += 10) {
      const [a, b] = bossIds(wave);
      expect(a).not.toBe(b);
    }
  });

  it('spawn last, one after the other, with the usual escort count', () => {
    const queue = composeWave(200);
    expect(queue).toHaveLength(Math.ceil(waveEnemyCount(200) / 2) + 2);
    expect(queue.slice(-2).map((s) => s.kind)).toEqual(['brute', 'hiveQueen']);
    expect(queue.filter(isBoss)).toHaveLength(2);
  });

  it('scale their reward with the wave and carry their trait', () => {
    const juggernaut = BOSSES.find((b) => b.id === 'juggernaut')!;
    const spec = bossSpec(juggernaut, 170);
    expect(spec.reward).toBe(juggernaut.reward + 170 * BOSS_REWARD_PER_WAVE);
    expect(spec.armor).toBe(150);
    expect(spec.boss).toBe(true);
    const phoenix = bossSpec(BOSSES.find((b) => b.id === 'phoenix')!, 250);
    expect(phoenix.fireproof).toBe(true);
    expect(phoenix.revive).toEqual({ hpRatio: 0.5, delayMs: 3000 });
  });

  it('give the hive queen escorts from the strongest tier at 30 % HP', () => {
    const queen = bossSpec(BOSSES.find((b) => b.id === 'hiveQueen')!, 150);
    const t8 = tierSpec(ENEMY_TIERS[7], 150);
    expect(queen.spawner).toMatchObject({ everyMs: 5000, maxTimes: 8 });
    expect(queen.spawner!.children).toHaveLength(4);
    expect(queen.spawner!.children[0].kind).toBe('T8');
    expect(queen.spawner!.children[0].hp).toBe(Math.round(t8.hp * 0.3));
  });
});

describe('wave themes', () => {
  it('start at wave 201, rotate in table order and skip boss waves', () => {
    expect(themeId(199)).toBe('normal');
    expect(themeId(200)).toBe('normal');
    expect([201, 202, 203, 204, 205, 206].map(themeId)).toEqual(['swarm', 'tank', 'rush', 'elite', 'normal', 'swarm']);
    for (let wave = 210; wave <= 400; wave += 10) expect(themeId(wave)).toBe('normal');
  });

  it('leave composition unchanged before wave 201', () => {
    for (const wave of [150, 199, 200]) {
      expect(composeWave(wave).filter((s) => !isBoss(s))).toHaveLength(
        isBossWave(wave) ? Math.ceil(waveEnemyCount(wave) / 2) : waveEnemyCount(wave),
      );
    }
  });

  it('swarm: twice the count at half HP and reward, spawning twice as fast', () => {
    const queue = composeWave(201);
    expect(queue).toHaveLength(waveEnemyCount(201) * 2);
    const t8 = queue.find((s) => s.kind === 'T8')!;
    const base = tierSpec(ENEMY_TIERS[7], 201);
    expect(t8.hp).toBe(Math.round(base.hp * 0.5));
    expect(t8.reward).toBe(Math.round(base.reward * 0.5));
    expect(waveSpawnIntervalMs(201)).toBe(WAVE_SPAWN_INTERVAL_MS / 2);
    expect(waveSpawnIntervalMs(202)).toBe(WAVE_SPAWN_INTERVAL_MS);
  });

  it('tank: half the count, twice the HP and reward, slower', () => {
    const queue = composeWave(202);
    expect(queue).toHaveLength(Math.ceil(waveEnemyCount(202) / 2));
    const t8 = queue.find((s) => s.kind === 'T8')!;
    const base = tierSpec(ENEMY_TIERS[7], 202);
    expect(t8.hp).toBe(base.hp * 2);
    expect(t8.reward).toBe(base.reward * 2);
    expect(t8.speed).toBeCloseTo(base.speed * 0.8);
  });

  it('rush: breaks the speed cap for one wave', () => {
    const t8 = composeWave(203).find((s) => s.kind === 'T8')!;
    expect(t8.speed).toBeCloseTo(ENEMY_TIERS[7].speed * WAVE_SPEED_MAX_MULTIPLIER * 1.3);
    expect(t8.hp).toBe(Math.round(tierSpec(ENEMY_TIERS[7], 203).hp * 0.75));
  });

  it('elite: half the count, specials only, split evenly', () => {
    const queue = composeWave(204);
    expect(queue).toHaveLength(Math.ceil(waveEnemyCount(204) / 2));
    expect(queue.every(isSpecial)).toBe(true);
    const counts = activeSpecials(204).map((sp) => queue.filter((s) => s.kind === sp.id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    const runner = queue.find((s) => s.kind === 'runner')!;
    expect(runner.reward).toBe(specialSpec(SPECIAL_ENEMIES[0], 204).reward * 2);
  });

  it('theme children too', () => {
    const splitter = composeWave(201).find((s) => s.kind === 'splitter')!;
    const plain = specialSpec(SPECIAL_ENEMIES[2], 201);
    expect(splitter.splitsInto![0].hp).toBe(Math.round(plain.splitsInto![0].hp * 0.5));
  });

  it('has a normal theme first and one intro per other theme', () => {
    expect(WAVE_THEMES[0].id).toBe('normal');
    expect(WAVE_THEMES[0].intro).toBeUndefined();
    for (const theme of WAVE_THEMES.slice(1)) expect(theme.intro).toBeTruthy();
  });
});
