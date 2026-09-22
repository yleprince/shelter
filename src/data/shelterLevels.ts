export interface ShelterLevel {
  level: number;
  // Scrap to reach this level from the one below; Lv1 is the starting shelter.
  cost: number;
  maxHp: number;
  unlockWave: number;
}

// Unlock waves line up with the turret unlocks, so both compete for the same scrap.
export const SHELTER_LEVELS: readonly ShelterLevel[] = [
  { level: 1, cost: 0, maxHp: 100, unlockWave: 0 },
  { level: 2, cost: 150, maxHp: 150, unlockWave: 5 },
  { level: 3, cost: 300, maxHp: 225, unlockWave: 10 },
  { level: 4, cost: 500, maxHp: 325, unlockWave: 20 },
  { level: 5, cost: 800, maxHp: 450, unlockWave: 30 },
];
