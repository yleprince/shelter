import { ARMOR_MIN_DAMAGE } from '../config';
import { TILE_TYPES } from '../data/tileTypes';
import type { TileType } from './MapGrid';

export function armoredDamage(damage: number, armor: number): number {
  if (armor <= 0) return damage;
  return Math.max(damage - armor, ARMOR_MIN_DAMAGE);
}

// The war aura's damage reduction applies after armor, to hits and burns alike.
export function damageTaken(amount: number, damageTakenMultiplier: number): number {
  return amount * damageTakenMultiplier;
}

export function terrainDamagePerSec(type: TileType | undefined, wave: number, fireproof = false): number {
  const dps = type && TILE_TYPES[type].damagePerSec;
  return dps && !fireproof ? dps.base + wave * dps.perWave : 0;
}

export function terrainDamage(type: TileType | undefined, wave: number, stepMs: number, fireproof = false): number {
  return (terrainDamagePerSec(type, wave, fireproof) * stepMs) / 1000;
}

export function terrainSpeedMultiplier(type: TileType | undefined, slowImmune: readonly TileType[] = []): number {
  if (!type || slowImmune.includes(type)) return 1;
  return TILE_TYPES[type].speedMultiplier;
}
