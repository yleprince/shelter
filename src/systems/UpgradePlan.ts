export type UpgradeBlocker = 'max-level' | 'locked' | 'too-expensive';

export interface UpgradeStep {
  // Scrap to reach this level from the one below.
  cost: number;
  unlockWave: number;
}

export type UpgradePlan = { targetLevel: number; cost: number } | { blocker: UpgradeBlocker };

// Levels are 1-based: `levels[currentLevel]` is the next one.
export function nextLevelBlocker(
  levels: readonly UpgradeStep[],
  currentLevel: number,
  wave: number,
  balance: number,
): UpgradeBlocker | null {
  const next = levels[currentLevel];
  if (!next) return 'max-level';
  if (wave < next.unlockWave) return 'locked';
  if (balance < next.cost) return 'too-expensive';
  return null;
}

// Takes levels in order until one is locked or the running total is unaffordable. Never
// skips a level, so an expensive Lv5 also stops an affordable Lv6.
export function planUpgrade(
  levels: readonly UpgradeStep[],
  currentLevel: number,
  wave: number,
  balance: number,
): UpgradePlan {
  let targetLevel = currentLevel;
  let cost = 0;
  while (nextLevelBlocker(levels, targetLevel, wave, balance - cost) === null) {
    cost += levels[targetLevel].cost;
    targetLevel++;
  }
  if (targetLevel === currentLevel) return { blocker: nextLevelBlocker(levels, currentLevel, wave, balance)! };
  return { targetLevel, cost };
}
