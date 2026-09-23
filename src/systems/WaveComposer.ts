import {
  BOSS_PAIR_FROM_WAVE,
  BOSS_REWARD_PER_WAVE,
  BOSS_WAVE_ESCORT_RATIO,
  BOSS_WAVE_INTERVAL,
  ENEMY_KILL_REWARD_PER_WAVE,
  SPECIAL_MAX_TOTAL_SHARE,
  SPECIAL_SHARE,
  SPLITTER_CHILD_COUNT,
  SPLITTER_CHILD_REWARD_RATIO,
  SPLITTER_CHILD_SCALE,
  WAVE_BASE_ENEMY_COUNT,
  WAVE_COUNT_INCREMENT,
  WAVE_HP_SCALE_PER_WAVE,
  WAVE_SPAWN_INTERVAL_MS,
  WAVE_SPEED_MAX_MULTIPLIER,
  WAVE_SPEED_SCALE_PER_WAVE,
  WAVE_THEMES_FROM_WAVE,
} from '../config';
import { BOSSES, type BossDef } from '../data/bosses';
import { ENEMY_TIERS, type EnemyKind, type EnemyTier } from '../data/enemyTiers';
import {
  SPECIAL_ENEMIES,
  type BurrowTrait,
  type EnemyTraitSet,
  type HealAura,
  type JamAura,
  type ReviveTrait,
  type SpecialEnemy,
  type WarAura,
} from '../data/specialEnemies';
import type { TileType } from '../data/tileTypes';
import { NORMAL_THEME, WAVE_THEMES, type WaveTheme } from '../data/waveThemes';

export interface SpawnerSpec {
  children: readonly EnemySpec[];
  everyMs: number;
  maxTimes: number;
}

export interface EnemySpec {
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  // Traits, applied generically by Enemy: no per-kind branches.
  boss?: boolean;
  armor?: number;
  slowImmune?: readonly TileType[];
  splitsInto?: readonly EnemySpec[];
  fireproof?: boolean;
  healAura?: HealAura;
  jamAura?: JamAura;
  warAura?: WarAura;
  burrow?: BurrowTrait;
  spawner?: SpawnerSpec;
  revive?: ReviveTrait;
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

export function activeBosses(wave: number): BossDef[] {
  return BOSSES.filter((boss) => boss.appearsFrom <= wave);
}

export function scaledHp(baseHp: number, wave: number): number {
  return Math.round(baseHp * (1 + wave * WAVE_HP_SCALE_PER_WAVE));
}

export function scaledSpeed(baseSpeed: number, wave: number): number {
  return baseSpeed * Math.min(1 + wave * WAVE_SPEED_SCALE_PER_WAVE, WAVE_SPEED_MAX_MULTIPLIER);
}

export function themeForWave(wave: number): WaveTheme {
  if (wave < WAVE_THEMES_FROM_WAVE || isBossWave(wave)) return NORMAL_THEME;
  return WAVE_THEMES[wave % WAVE_THEMES.length];
}

export function waveSpawnIntervalMs(wave: number): number {
  return WAVE_SPAWN_INTERVAL_MS * themeForWave(wave).spawnIntervalMultiplier;
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

function strongestTier(wave: number): EnemyTier {
  const tiers = activeTiers(wave);
  return tiers[tiers.length - 1];
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

function withTraits(spec: EnemySpec, traits: EnemyTraitSet, wave: number): EnemySpec {
  const { armor, slowImmune, splits, fireproof, healAura, jamAura, warAura, burrow, spawner, revive } = traits;
  if (armor) spec.armor = armor;
  if (slowImmune) spec.slowImmune = slowImmune;
  if (splits) spec.splitsInto = splitterChildren(wave);
  if (fireproof) spec.fireproof = true;
  if (healAura) spec.healAura = healAura;
  if (jamAura) spec.jamAura = jamAura;
  if (warAura) spec.warAura = warAura;
  if (burrow) spec.burrow = burrow;
  if (revive) spec.revive = revive;
  if (spawner) {
    const base = tierSpec(spawner.child === 'weakest' ? ENEMY_TIERS[0] : strongestTier(wave), wave);
    const child: EnemySpec = {
      ...base,
      hp: Math.max(1, Math.round(base.hp * spawner.hpRatio)),
      reward: Math.floor(base.reward * spawner.rewardRatio),
    };
    if (spawner.scale) child.scale = spawner.scale;
    spec.spawner = {
      children: Array.from({ length: spawner.count }, () => ({ ...child })),
      everyMs: spawner.everyMs,
      maxTimes: spawner.maxTimes,
    };
  }
  return spec;
}

export function specialSpec(special: SpecialEnemy, wave: number): EnemySpec {
  const spec: EnemySpec = {
    kind: special.id,
    hp: scaledHp(special.hp, wave),
    speed: scaledSpeed(special.speed, wave),
    damage: special.damage,
    reward: special.reward + wave * ENEMY_KILL_REWARD_PER_WAVE,
  };
  return withTraits(spec, special.traits, wave);
}

// Built from the strongest active tier's HP and T1's speed, so it keeps pace with the wave.
export function bossSpec(boss: BossDef, wave: number): EnemySpec {
  const spec: EnemySpec = {
    kind: boss.id,
    boss: true,
    hp: boss.hpMultiplier * scaledHp(strongestTier(wave).hp, wave),
    speed: boss.speedMultiplier * scaledSpeed(ENEMY_TIERS[0].speed, wave),
    damage: boss.damage,
    reward: boss.reward + wave * BOSS_REWARD_PER_WAVE,
  };
  return withTraits(spec, boss.traits, wave);
}

// A boss's debut is the boss wave equal to its appearsFrom; otherwise a fixed rotation over
// the active bosses. From BOSS_PAIR_FROM_WAVE, the next active boss in table order joins.
export function bossesForWave(wave: number): BossDef[] {
  if (!isBossWave(wave)) return [];
  const active = activeBosses(wave);
  const debut = active.findIndex((boss) => boss.appearsFrom === wave);
  const index = debut >= 0 ? debut : (wave / BOSS_WAVE_INTERVAL) % active.length;
  const bosses = [active[index]];
  if (wave >= BOSS_PAIR_FROM_WAVE && active.length > 1) bosses.push(active[(index + 1) % active.length]);
  return bosses;
}

// Each active special's share of a wave: SPECIAL_SHARE each, until there are enough of them
// that they'd pass SPECIAL_MAX_TOTAL_SHARE together; then they split that evenly.
export function specialShare(activeCount: number): number {
  return activeCount === 0 ? 0 : Math.min(SPECIAL_SHARE, SPECIAL_MAX_TOTAL_SHARE / activeCount);
}

// How many of each active special a wave of `total` enemies carries.
export function specialCounts(wave: number, total: number): Map<SpecialEnemy, number> {
  const specials = activeSpecials(wave);
  const share = specialShare(specials.length);
  return new Map(specials.map((special) => [special, Math.ceil(total * share)]));
}

// Specials-only waves: all of `total`, split evenly, remainder to the earliest specials.
function eliteSpecialCounts(wave: number, total: number): Map<SpecialEnemy, number> {
  const specials = activeSpecials(wave);
  const share = Math.floor(total / specials.length);
  const remainder = total % specials.length;
  return new Map(specials.map((special, i) => [special, share + (i < remainder ? 1 : 0)]));
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

// Children (splitter, spawner) are themed too, so a swarm's minions stay as frail as it.
export function themedSpec(spec: EnemySpec, theme: WaveTheme): EnemySpec {
  if (theme === NORMAL_THEME) return spec;
  const themed: EnemySpec = {
    ...spec,
    hp: Math.max(1, Math.round(spec.hp * theme.hpMultiplier)),
    speed: spec.speed * theme.speedMultiplier,
    reward: Math.round(spec.reward * theme.rewardMultiplier),
  };
  if (spec.splitsInto) themed.splitsInto = spec.splitsInto.map((child) => themedSpec(child, theme));
  if (spec.spawner) {
    themed.spawner = { ...spec.spawner, children: spec.spawner.children.map((child) => themedSpec(child, theme)) };
  }
  return themed;
}

// Spawn queue for a wave: tiers weakest first with specials spread evenly through them
// (taken out of the normal count, round-robin between kinds); on boss waves the bosses
// come last. Themed waves change the count and stats, or make the wave specials only.
export function composeWave(wave: number): EnemySpec[] {
  const bosses = bossesForWave(wave);
  const theme = themeForWave(wave);
  const base = bosses.length > 0 ? waveEnemyCount(wave) * BOSS_WAVE_ESCORT_RATIO : waveEnemyCount(wave);
  const total = Math.ceil(base * theme.countMultiplier);
  const specialsOnly = theme.specialsOnly && activeSpecials(wave).length > 0;

  const remaining = [...(specialsOnly ? eliteSpecialCounts(wave, total) : specialCounts(wave, total))];
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

  const queue = interleave(tiers, specials).map((spec) => themedSpec(spec, theme));
  for (const boss of bosses) queue.push(bossSpec(boss, wave));
  return queue;
}
