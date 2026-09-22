import { GRAVEL_SPEED_MULTIPLIER } from '../config';
import type { TowerLevel } from '../data/towerLevels';
import type { TileType } from '../systems/MapGrid';
import type { RepairBlocker } from '../systems/ShelterHealth';
import type { EditBlocker } from '../systems/TileEditor';
import type { UpgradeBlocker } from '../systems/TowerProgress';

export const TILE_TYPE_DESCRIPTIONS: Readonly<Record<TileType, string>> = {
  path: 'Path',
  gravel: `Gravel · enemies ×${GRAVEL_SPEED_MULTIPLIER}`,
  ground: 'Ground (buildable)',
};

export function editBlockerText(blocker: EditBlocker, type: TileType): string {
  switch (blocker) {
    case 'not-playable':
      return "Can't edit here";
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

export function repairBlockerText(blocker: RepairBlocker): string {
  return blocker === 'full' ? 'Shelter at full HP' : 'Not enough scrap';
}
