import { describe, expect, it } from 'vitest';
import { MapGrid } from '../src/systems/MapGrid';

const waypoints = [
  { col: -1, row: 2 },
  { col: 3, row: 2 },
  { col: 3, row: 5 },
];

describe('MapGrid', () => {
  const grid = () => new MapGrid(8, 8, 10, waypoints, 1);

  it('marks every tile along orthogonal segments as path, clipped to the map', () => {
    const g = grid();
    for (let col = 0; col <= 3; col++) expect(g.isPath({ col, row: 2 })).toBe(true);
    for (let row = 2; row <= 5; row++) expect(g.isPath({ col: 3, row })).toBe(true);
    expect(g.isPath({ col: 4, row: 2 })).toBe(false);
  });

  it('allows building on any free non-path tile below the HUD', () => {
    const g = grid();
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(true);
    expect(g.isBuildable({ col: 1, row: 2 })).toBe(false);
    expect(g.isBuildable({ col: 6, row: 0 })).toBe(false);
    expect(g.isBuildable({ col: 8, row: 3 })).toBe(false);
    g.occupy({ col: 6, row: 6 });
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(false);
    g.release({ col: 6, row: 6 });
    expect(g.isBuildable({ col: 6, row: 6 })).toBe(true);
  });

  it('rejects diagonal segments', () => {
    expect(() => new MapGrid(8, 8, 10, [{ col: 0, row: 0 }, { col: 2, row: 2 }], 0)).toThrow();
  });

  it('converts between tiles and world coordinates', () => {
    const g = grid();
    expect(g.tileToWorld({ col: 2, row: 3 })).toEqual({ x: 25, y: 35 });
    expect(g.worldToTile({ x: 29, y: 31 })).toEqual({ col: 2, row: 3 });
  });
});
