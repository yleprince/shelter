import { describe, expect, it } from 'vitest';
import { GRID_COLS, GRID_ROWS, HUD_ROWS, TILE_SIZE } from '../src/config';
import { MAPS, shelterTile } from '../src/data/maps';
import { MapGrid } from '../src/systems/MapGrid';

describe.each(MAPS)('map $name', (map) => {
  it('has orthogonal segments', () => {
    expect(() => new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, map.waypoints, HUD_ROWS)).not.toThrow();
  });

  it('starts off-map and ends at an in-bounds shelter below the HUD', () => {
    const grid = new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, map.waypoints, HUD_ROWS);
    expect(grid.isInBounds(map.waypoints[0])).toBe(false);
    const shelter = shelterTile(map);
    expect(grid.isInBounds(shelter)).toBe(true);
    expect(shelter.row).toBeGreaterThanOrEqual(HUD_ROWS);
  });

  it('keeps the whole path out from under the HUD', () => {
    for (const { row } of map.waypoints) expect(row).toBeGreaterThanOrEqual(HUD_ROWS);
  });
});

describe('maps', () => {
  it('get shorter as they get harder', () => {
    const pathLength = (waypoints: readonly { col: number; row: number }[]) =>
      waypoints.slice(1).reduce((sum, w, i) => sum + Math.abs(w.col - waypoints[i].col) + Math.abs(w.row - waypoints[i].row), 0);
    const sorted = [...MAPS].sort((a, b) => a.scoreMultiplier - b.scoreMultiplier);
    const lengths = sorted.map((m) => pathLength(m.waypoints));
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
    expect(new Set(lengths).size).toBe(lengths.length);
  });
});
