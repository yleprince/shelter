import type { EnemyKind } from './enemyTiers';
import { SHELTER_LEVELS } from './shelterLevels';
import { TOWER_LEVELS } from './towerLevels';

export const TEXTURES = {
  ground: 'tile-ground',
  path: 'tile-path',
  gravel: 'tile-gravel',
  water: 'tile-water',
  fire: 'tile-fire',
  ice: 'tile-ice',
  towerBase: 'tower-base',
  projectile: 'projectile',
  // What a burrower looks like while underground.
  burrowMound: 'enemy-burrow-mound',
} as const;

// Indexed by tower level - 1.
export const TOWER_GUN_TEXTURES: readonly string[] = TOWER_LEVELS.map(({ level }) => `tower-gun-${level}`);

// Indexed by shelter level - 1.
export const SHELTER_TEXTURES: readonly string[] = SHELTER_LEVELS.map(({ level }) => `shelter-lv${level}`);

export const ENEMY_TEXTURES: Readonly<Record<EnemyKind, string>> = {
  T1: 'enemy-t1',
  T2: 'enemy-t2',
  T3: 'enemy-t3',
  T4: 'enemy-t4',
  T5: 'enemy-t5',
  T6: 'enemy-t6',
  T7: 'enemy-t7',
  T8: 'enemy-t8',
  runner: 'enemy-runner',
  armored: 'enemy-armored',
  splitter: 'enemy-splitter',
  swimmer: 'enemy-swimmer',
  healer: 'enemy-healer',
  jammer: 'enemy-jammer',
  burrower: 'enemy-burrower',
  carrier: 'enemy-carrier',
  salamander: 'enemy-salamander',
  brute: 'enemy-boss',
  hiveQueen: 'enemy-boss-hiveQueen',
  juggernaut: 'enemy-boss-juggernaut',
  warlord: 'enemy-boss-warlord',
  leviathan: 'enemy-boss-leviathan',
  phoenix: 'enemy-boss-phoenix',
};

export const DEPTH = {
  ground: 0,
  hover: 1,
  route: 1,
  shelter: 2,
  tower: 3,
  enemy: 4,
  projectile: 5,
  overlay: 6,
  // Above the pause overlay: planning while paused needs a crisp cursor.
  cursor: 7,
} as const;
