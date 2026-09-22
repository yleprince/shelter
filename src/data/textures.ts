import type { EnemyKind } from './enemyTiers';

export const TEXTURES = {
  ground: 'tile-ground',
  path: 'tile-path',
  towerBase: 'tower-base',
  projectile: 'projectile',
  shelter: 'shelter',
} as const;

// Indexed by tower level - 1.
export const TOWER_GUN_TEXTURES: readonly string[] = [1, 2, 3, 4, 5].map((level) => `tower-gun-${level}`);

export const ENEMY_TEXTURES: Readonly<Record<EnemyKind, string>> = {
  T1: 'enemy-t1',
  T2: 'enemy-t2',
  T3: 'enemy-t3',
  T4: 'enemy-t4',
  T5: 'enemy-t5',
  boss: 'enemy-boss',
};

export const DEPTH = {
  ground: 0,
  hover: 1,
  shelter: 2,
  tower: 3,
  enemy: 4,
  projectile: 5,
} as const;
