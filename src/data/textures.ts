export const TEXTURES = {
  ground: 'tile-ground',
  path: 'tile-path',
  towerBase: 'tower-base',
  towerGun: 'tower-gun',
  enemy: 'enemy',
  projectile: 'projectile',
  shelter: 'shelter',
} as const;

export const DEPTH = {
  ground: 0,
  hover: 1,
  shelter: 2,
  tower: 3,
  enemy: 4,
  projectile: 5,
} as const;
