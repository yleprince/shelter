import { describe, expect, it } from 'vitest';
import { GRID_COLS, GRID_ROWS, HUD_ROWS, STATUS_ROWS, TILE_SIZE } from '../src/config';
import { MAPS, shelterTile, type MapDefinition } from '../src/data/maps';
import { MapGrid } from '../src/systems/MapGrid';

const gridFor = (map: MapDefinition) => new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, map.waypoints, HUD_ROWS, STATUS_ROWS);

describe.each(MAPS)('map $name', (map) => {
  it('has orthogonal segments', () => {
    expect(() => gridFor(map)).not.toThrow();
  });

  it('starts off-map and ends at an in-bounds shelter in the playable rows', () => {
    const grid = gridFor(map);
    expect(grid.isInBounds(map.waypoints[0])).toBe(false);
    expect(grid.isPlayable(shelterTile(map))).toBe(true);
  });

  it('keeps the whole path out of the HUD and the status line', () => {
    for (const { row } of map.waypoints) {
      expect(row).toBeGreaterThanOrEqual(HUD_ROWS);
      expect(row).toBeLessThan(GRID_ROWS - STATUS_ROWS);
    }
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
