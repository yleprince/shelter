import { TILE_EDIT_BASE_COST, TILE_EDIT_COST_PER_WAVE } from '../config';
import type { TileCoord } from '../data/maps';
import { sameTile, type MapGrid, type TileType } from './MapGrid';
import { PathField } from './PathField';

export type EditBlocker =
  | 'not-playable'
  | 'shelter'
  | 'entry'
  | 'tower'
  | 'same-type'
  | 'enemy'
  | 'disconnects'
  | 'too-expensive';

export interface EditContext {
  grid: MapGrid;
  shelter: TileCoord;
  // Tiles each enemy stands on or walks toward: they must stay walkable and connected.
  enemyTiles: readonly TileCoord[];
  wave: number;
  balance: number;
}

export function editCost(type: TileType, wave: number): number {
  return TILE_EDIT_BASE_COST[type] + wave * TILE_EDIT_COST_PER_WAVE;
}

// The grid's tile types with one tile swapped, without touching the grid.
export function withEdit(grid: MapGrid, tile: TileCoord, type: TileType): (t: TileCoord) => TileType {
  return (t) => (sameTile(t, tile) ? type : grid.tileType(t));
}

export function editBlocker(tile: TileCoord, type: TileType, ctx: EditContext): EditBlocker | null {
  const { grid } = ctx;
  if (!grid.isPlayable(tile)) return 'not-playable';
  if (sameTile(tile, ctx.shelter)) return 'shelter';
  if (type === 'ground' && sameTile(tile, grid.entry)) return 'entry';
  if (grid.isOccupied(tile)) return 'tower';
  if (grid.tileType(tile) === type) return 'same-type';
  // Only turning a tile into ground can block anyone; path and gravel only change costs.
  if (type === 'ground') {
    if (ctx.enemyTiles.some((t) => sameTile(t, tile))) return 'enemy';
    const field = new PathField(grid.cols, grid.rows, withEdit(grid, tile, type), ctx.shelter);
    const mustReach = [grid.entry, ...ctx.enemyTiles.filter((t) => grid.isInBounds(t))];
    if (!mustReach.every((t) => field.isReachable(t))) return 'disconnects';
  }
  if (ctx.balance < editCost(type, ctx.wave)) return 'too-expensive';
  return null;
}
