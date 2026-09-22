import {
  BOSS_CONTACT_DAMAGE,
  BOSS_HP_MULTIPLIER,
  BOSS_REWARD,
  BOSS_SPEED_MULTIPLIER,
  BOSS_WAVE_ESCORT_RATIO,
  BOSS_WAVE_INTERVAL,
  ENEMY_KILL_REWARD_PER_WAVE,
  SPECIAL_SHARE,
  SPLITTER_CHILD_COUNT,
  SPLITTER_CHILD_REWARD_RATIO,
  SPLITTER_CHILD_SCALE,
  WAVE_BASE_ENEMY_COUNT,
  WAVE_COUNT_INCREMENT,
  WAVE_HP_SCALE_PER_WAVE,
  WAVE_SPEED_MAX_MULTIPLIER,
  WAVE_SPEED_SCALE_PER_WAVE,
} from '../config';
import { ENEMY_TIERS, type EnemyKind, type EnemyTier } from '../data/enemyTiers';
import { SPECIAL_ENEMIES, type SpecialEnemy } from '../data/specialEnemies';

export interface EnemySpec {
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  // Traits, applied generically by Enemy: no per-kind branches.
  armor?: number;
  ignoresGravel?: boolean;
  splitsInto?: readonly EnemySpec[];
  // Render scale; splitter children reuse T1's look, smaller.
  scale?: number;
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

export function activeSpecials(wave: number): SpecialEnemy[] {
  return SPECIAL_ENEMIES.filter((special) => special.appearsFrom <= wave);
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

export function splitterChildren(wave: number): EnemySpec[] {
  const t1 = tierSpec(ENEMY_TIERS[0], wave);
  const child: EnemySpec = {
    ...t1,
    reward: Math.floor(t1.reward * SPLITTER_CHILD_REWARD_RATIO),
    scale: SPLITTER_CHILD_SCALE,
  };
  return Array.from({ length: SPLITTER_CHILD_COUNT }, () => ({ ...child }));
}

export function specialSpec(special: SpecialEnemy, wave: number): EnemySpec {
  const spec: EnemySpec = {
    kind: special.id,
    hp: scaledHp(special.hp, wave),
    speed: scaledSpeed(special.speed, wave),
    damage: special.damage,
    reward: special.reward + wave * ENEMY_KILL_REWARD_PER_WAVE,
  };
  const { armor, ignoresGravel, splits } = special.traits;
  if (armor) spec.armor = armor;
  if (ignoresGravel) spec.ignoresGravel = true;
  if (splits) spec.splitsInto = splitterChildren(wave);
  return spec;
}

// How many of each active special a wave of `total` enemies carries.
export function specialCounts(wave: number, total: number): Map<SpecialEnemy, number> {
  return new Map(activeSpecials(wave).map((special) => [special, Math.ceil(total * SPECIAL_SHARE)]));
}

// Spreads `extras` evenly through `base`, keeping both orders, so specials never arrive
// as one block.
export function interleave<T>(base: readonly T[], extras: readonly T[]): T[] {
  const length = base.length + extras.length;
  const slots = new Set(extras.map((_, j) => Math.floor(((j + 0.5) * length) / extras.length)));
  const result: T[] = [];
  let b = 0;
  let e = 0;
  for (let i = 0; i < length; i++) result.push(slots.has(i) ? extras[e++] : base[b++]);
  return result;
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

// Spawn queue for a wave: tiers weakest first with specials spread evenly through them
// (taken out of the normal count, round-robin between kinds); on boss waves the boss
// comes last.
export function composeWave(wave: number): EnemySpec[] {
  const boss = isBossWave(wave);
  const total = boss ? Math.ceil(waveEnemyCount(wave) * BOSS_WAVE_ESCORT_RATIO) : waveEnemyCount(wave);

  const remaining = [...specialCounts(wave, total)];
  const specials: EnemySpec[] = [];
  while (remaining.some(([, n]) => n > 0) && specials.length < total) {
    for (const entry of remaining) {
      if (entry[1] === 0 || specials.length >= total) continue;
      specials.push(specialSpec(entry[0], wave));
      entry[1]--;
    }
  }

  const tiers: EnemySpec[] = [];
  for (const [tier, count] of tierCounts(wave, total - specials.length)) {
    const spec = tierSpec(tier, wave);
    for (let i = 0; i < count; i++) tiers.push({ ...spec });
  }

  const queue = interleave(tiers, specials);
  if (boss) queue.push(bossSpec(wave));
  return queue;
}
