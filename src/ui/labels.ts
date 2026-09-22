import { TILE_TYPES } from '../data/tileTypes';
import type { ShelterLevel } from '../data/shelterLevels';
import type { TowerLevel } from '../data/towerLevels';
import type { TileType } from '../systems/MapGrid';
import type { RepairBlocker } from '../systems/ShelterHealth';
import type { EditBlocker } from '../systems/TileEditor';
import type { UpgradeBlocker } from '../systems/UpgradePlan';

export function tileTypeDescription(type: TileType): string {
  const { name, walkable, speedMultiplier } = TILE_TYPES[type];
  if (!walkable) return `${name} (buildable)`;
  return speedMultiplier === 1 ? name : `${name} · enemies ×${speedMultiplier}`;
}

export function editBlockerText(blocker: EditBlocker, type: TileType): string {
  switch (blocker) {
    case 'not-playable':
      return "Can't edit here";
    case 'locked':
      return `${TILE_TYPES[type].name} unlocks at wave ${TILE_TYPES[type].unlockWave}`;
    case 'shelter':
      return 'The shelter tile is fixed';
    case 'entry':
      return 'The entry must stay walkable';
    case 'tower':
      return 'Sell the tower first';
    case 'same-type':
      return `Already ${type}`;
    case 'enemy':
      return 'An enemy is in the way';
    case 'disconnects':
      return 'Would cut the route to the shelter';
    case 'too-expensive':
      return 'Not enough scrap';
  }
}

export function upgradeBlockerText(blocker: UpgradeBlocker, next: TowerLevel | undefined): string {
  switch (blocker) {
    case 'max-level':
      return 'Already at max level';
    case 'locked':
      return next ? `Unlocks at wave ${next.unlockWave}` : '';
    case 'too-expensive':
      return 'Not enough scrap';
  }
}

export function shelterUpgradeBlockerText(blocker: UpgradeBlocker, next: ShelterLevel | undefined): string {
  switch (blocker) {
    case 'max-level':
      return 'Shelter at max level';
    case 'locked':
      return next ? `Shelter Lv${next.level} unlocks at wave ${next.unlockWave}` : '';
    case 'too-expensive':
      return 'Not enough scrap';
  }
}

export function repairBlockerText(blocker: RepairBlocker): string {
  return blocker === 'full' ? 'Shelter at full HP' : 'Not enough scrap';
}
