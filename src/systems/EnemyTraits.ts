import { ARMOR_MIN_DAMAGE } from '../config';
import { TILE_TYPES } from '../data/tileTypes';
import type { TileType } from './MapGrid';

export function armoredDamage(damage: number, armor: number): number {
  if (armor <= 0) return damage;
  return Math.max(damage - armor, ARMOR_MIN_DAMAGE);
}

export function terrainDamagePerSec(type: TileType | undefined, wave: number): number {
  const dps = type && TILE_TYPES[type].damagePerSec;
  return dps ? dps.base + wave * dps.perWave : 0;
}

export function terrainDamage(type: TileType | undefined, wave: number, stepMs: number): number {
  return (terrainDamagePerSec(type, wave) * stepMs) / 1000;
}

export function terrainSpeedMultiplier(type: TileType | undefined, ignoresGravel: boolean): number {
  if (!type || (type === 'gravel' && ignoresGravel)) return 1;
  return TILE_TYPES[type].speedMultiplier;
}
