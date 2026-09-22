import {
  BOSS_CONTACT_DAMAGE,
  BOSS_HP_MULTIPLIER,
  BOSS_REWARD,
  BOSS_SPEED_MULTIPLIER,
  BOSS_WAVE_ESCORT_RATIO,
  BOSS_WAVE_INTERVAL,
  ENEMY_KILL_REWARD_PER_WAVE,
  WAVE_BASE_ENEMY_COUNT,
  WAVE_COUNT_INCREMENT,
  WAVE_HP_SCALE_PER_WAVE,
  WAVE_SPEED_MAX_MULTIPLIER,
  WAVE_SPEED_SCALE_PER_WAVE,
} from '../config';
import { ENEMY_TIERS, type EnemyKind, type EnemyTier } from '../data/enemyTiers';

export interface EnemySpec {
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
}

export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % BOSS_WAVE_INTERVAL === 0;
}

export function waveEnemyCount(wave: number): number {
  return WAVE_BASE_ENEMY_COUNT + wave * WAVE_COUNT_INCREMENT;
}

export function activeTiers(wave: number): EnemyTier[] {
  return ENEMY_TIERS.filter((tier) => tier.appearsFrom <= wave && wave <= tier.retiresAfter);
}

export function scaledHp(baseHp: number, wave: number): number {
  return Math.round(baseHp * (1 + wave * WAVE_HP_SCALE_PER_WAVE));
}

export function scaledSpeed(baseSpeed: number, wave: number): number {
  return baseSpeed * Math.min(1 + wave * WAVE_SPEED_SCALE_PER_WAVE, WAVE_SPEED_MAX_MULTIPLIER);
}

// Even split across active tiers; the remainder goes to the weakest ones.
export function tierCounts(wave: number, total: number): Map<EnemyTier, number> {
  const tiers = activeTiers(wave);
  const share = Math.floor(total / tiers.length);
  const remainder = total % tiers.length;
  return new Map(tiers.map((tier, i) => [tier, share + (i < remainder ? 1 : 0)]));
}

export function tierSpec(tier: EnemyTier, wave: number): EnemySpec {
  return {
    kind: tier.id,
    hp: scaledHp(tier.hp, wave),
    speed: scaledSpeed(tier.speed, wave),
    damage: tier.damage,
    reward: tier.reward + wave * ENEMY_KILL_REWARD_PER_WAVE,
  };
}

export function bossSpec(wave: number): EnemySpec {
  const tiers = activeTiers(wave);
  const strongest = tiers[tiers.length - 1];
  return {
    kind: 'boss',
    hp: BOSS_HP_MULTIPLIER * scaledHp(strongest.hp, wave),
    speed: BOSS_SPEED_MULTIPLIER * scaledSpeed(ENEMY_TIERS[0].speed, wave),
    damage: BOSS_CONTACT_DAMAGE,
    reward: BOSS_REWARD,
  };
}

// Spawn queue for a wave, weakest first; on boss waves the boss comes last.
export function composeWave(wave: number): EnemySpec[] {
  const boss = isBossWave(wave);
  const total = boss ? Math.ceil(waveEnemyCount(wave) * BOSS_WAVE_ESCORT_RATIO) : waveEnemyCount(wave);
  const queue: EnemySpec[] = [];
  for (const [tier, count] of tierCounts(wave, total)) {
    const spec = tierSpec(tier, wave);
    for (let i = 0; i < count; i++) queue.push({ ...spec });
  }
  if (boss) queue.push(bossSpec(wave));
  return queue;
}
