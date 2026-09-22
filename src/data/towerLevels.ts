export interface TowerLevel {
  level: number;
  // Scrap to reach this level: the placement price for Lv1, the upgrade price after.
  cost: number;
  damage: number;
  range: number;
  cooldownMs: number;
  unlockWave: number;
}

export const TOWER_LEVELS: readonly TowerLevel[] = [
  { level: 1, cost: 50, damage: 10, range: 120, cooldownMs: 600, unlockWave: 1 },
  { level: 2, cost: 60, damage: 16, range: 130, cooldownMs: 550, unlockWave: 1 },
  { level: 3, cost: 100, damage: 26, range: 140, cooldownMs: 500, unlockWave: 5 },
  { level: 4, cost: 160, damage: 42, range: 155, cooldownMs: 450, unlockWave: 10 },
  { level: 5, cost: 250, damage: 70, range: 170, cooldownMs: 400, unlockWave: 15 },
];

export const TOWER_PLACE_COST = TOWER_LEVELS[0].cost;
