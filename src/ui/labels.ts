import { BOSSES } from '../data/bosses';
import type { EnemyKind } from '../data/enemyTiers';
import { SPECIAL_ENEMIES } from '../data/specialEnemies';
import { TILE_TYPES } from '../data/tileTypes';
import type { WaveTheme } from '../data/waveThemes';
import { terrainDamagePerSec } from '../systems/EnemyTraits';
import type { ShelterLevel } from '../data/shelterLevels';
import type { TowerLevel } from '../data/towerLevels';
import type { TileType } from '../systems/MapGrid';
import type { RepairBlocker } from '../systems/ShelterHealth';
import type { EditBlocker } from '../systems/TileEditor';
import type { UpgradeBlocker } from '../systems/UpgradePlan';

export function tileTypeDescription(type: TileType, wave: number): string {
  const { name, walkable, speedMultiplier, killScoreMultiplier } = TILE_TYPES[type];
  if (!walkable) return `${name} (buildable)`;
  const parts = [name];
  if (speedMultiplier !== 1) parts.push(`enemies ×${speedMultiplier}`);
  const dps = terrainDamagePerSec(type, wave);
  if (dps > 0) parts.push(`${Math.round(dps)} dmg/s`);
  if (killScoreMultiplier) parts.push(`kill score ×${killScoreMultiplier}`);
  return parts.join(' · ');
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

const ENEMY_INTROS: ReadonlyMap<EnemyKind, string> = new Map(
  [...SPECIAL_ENEMIES, ...BOSSES].map(({ id, name, intro }) => [id, `New: ${name} · ${intro}`]),
);

// Tiers have no intro: only specials and bosses bring a new rule.
export function enemyIntro(kind: EnemyKind): string | undefined {
  return ENEMY_INTROS.get(kind);
}

export function themeIntro(theme: WaveTheme): string | undefined {
  return theme.intro && `New: ${theme.name} wave · ${theme.intro}`;
}

// Announces the coming wave's bosses or theme during the breather; plain waves get none.
export function waveBanner(wave: number, bosses: readonly { name: string }[], theme: WaveTheme): string | undefined {
  if (bosses.length > 0) return `BOSS wave: ${bosses.map((b) => b.name).join(' + ')}`;
  return theme.intro && `Wave ${wave}: ${theme.name} · ${theme.intro}`;
}
