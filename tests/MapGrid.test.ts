import { describe, expect, it } from 'vitest';
import { MapGrid } from '../src/systems/MapGrid';

const waypoints = [
  { col: -1, row: 2 },
  { col: 3, row: 2 },
  { col: 3, row: 5 },
];

describe('MapGrid', () => {
  const grid = () => new MapGrid(8, 8, 10, waypoints, 1, 1);

  it('lays path along orthogonal segments, clipped to the map, ground elsewhere', () => {
    const g = grid();
    for (let col = 0; col <= 3; col++) expect(g.tileType({ col, row: 2 })).toBe('path');
    for (let row = 2; row <= 5; row++) expect(g.tileType({ col: 3, row })).toBe('path');
    expect(g.tileType({ col: 4, row: 2 })).toBe('ground');
  });

  it('finds the entry tile and keeps the off-map lead-in', () => {
    const g = grid();
    expect(g.entry).toEqual({ col: 0, row: 2 });
    expect(g.leadIn).toEqual({ col: -1, row: 2 });
  });

  it('allows building on free ground inside the playable rows only', () => {
    const g = grid();
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(true);
    expect(g.isBuildable({ col: 1, row: 2 })).toBe(false);
    expect(g.isBuildable({ col: 6, row: 0 })).toBe(false);
    expect(g.isBuildable({ col: 6, row: 7 })).toBe(false);
    expect(g.isBuildable({ col: 8, row: 3 })).toBe(false);
    g.occupy({ col: 6, row: 6 });
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(false);
    g.release({ col: 6, row: 6 });
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(true);
  });

  it('changes tile types: walkable path and gravel, buildable ground', () => {
    const g = grid();
    g.setTileType({ col: 1, row: 2 }, 'ground');
    expect(g.isBuildable({ col: 1, row: 2 })).toBe(true);
    expect(g.isWalkable({ col: 1, row: 2 })).toBe(false);
    g.setTileType({ col: 6, row: 6 }, 'gravel');
    expect(g.isWalkable({ col: 6, row: 6 })).toBe(true);
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(false);
    expect(g.isWalkable({ col: -1, row: 2 })).toBe(false);
  });

  it('rejects diagonal segments', () => {
    expect(() => new MapGrid(8, 8, 10, [{ col: 0, row: 0 }, { col: 2, row: 2 }], 0, 0)).toThrow();
  });

  it('converts between tiles and world coordinates', () => {
    const g = grid();
    expect(g.tileToWorld({ col: 2, row: 3 })).toEqual({ x: 25, y: 35 });
    expect(g.worldToTile({ x: 29, y: 31 })).toEqual({ col: 2, row: 3 });
  });
});
