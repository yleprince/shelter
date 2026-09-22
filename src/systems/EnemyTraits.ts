import { ARMOR_MIN_DAMAGE, GRAVEL_SPEED_MULTIPLIER } from '../config';
import type { TileType } from './MapGrid';

export function armoredDamage(damage: number, armor: number): number {
  if (armor <= 0) return damage;
  return Math.max(damage - armor, ARMOR_MIN_DAMAGE);
}

export function terrainSpeedMultiplier(type: TileType | undefined, ignoresGravel: boolean): number {
  return type === 'gravel' && !ignoresGravel ? GRAVEL_SPEED_MULTIPLIER : 1;
}
