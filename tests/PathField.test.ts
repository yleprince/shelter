import { describe, expect, it } from 'vitest';
import { GRID_COLS, GRID_ROWS, HUD_ROWS, STATUS_ROWS, TILE_SIZE } from '../src/config';
import { MAPS, shelterTile, type TileCoord } from '../src/data/maps';
import { MapGrid, type TileType } from '../src/systems/MapGrid';
import { PathField } from '../src/systems/PathField';

// Every in-bounds tile along the waypoints, in walking order.
function waypointTiles(waypoints: readonly TileCoord[]): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const steps = Math.abs(to.col - from.col) + Math.abs(to.row - from.row);
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const tile = {
        col: from.col + Math.sign(to.col - from.col) * s,
        row: from.row + Math.sign(to.row - from.row) * s,
      };
      if (tile.col >= 0 && tile.row >= 0) tiles.push(tile);
    }
  }
  return tiles;
}

// A 7×5 grid from a picture: '.' ground, '#' path, '~' gravel.
function gridFrom(rows: string[]): (tile: TileCoord) => TileType {
  return ({ col, row }) => {
    const c = rows[row]?.[col];
    return c === '#' ? 'path' : c === '~' ? 'gravel' : 'ground';
  };
}

describe('PathField', () => {
  it.each(MAPS)('routes $name exactly along its initial waypoints', (map) => {
    const grid = new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, map.waypoints, HUD_ROWS, STATUS_ROWS);
    const field = new PathField(GRID_COLS, GRID_ROWS, (t) => grid.tileType(t), shelterTile(map));
    expect(field.route(grid.entry)).toEqual(waypointTiles(map.waypoints));
  });

  const loop = [
    '.......',
    '#######',
    '.#####.',
    '.......',
    '.......',
  ];
  const goal = { col: 6, row: 1 };

  it('takes the shortest route when both are plain path', () => {
    const field = new PathField(7, 5, gridFrom(loop), goal);
    expect(field.route({ col: 0, row: 1 })).toHaveLength(7);
    expect(field.distance({ col: 0, row: 1 })).toBe(6);
  });

  it('takes the fastest route, so gravel on one branch diverts enemies to the other', () => {
    const graveled = [...loop];
    graveled[1] = '##~~~##';
    const field = new PathField(7, 5, gridFrom(graveled), goal);
    const route = field.route({ col: 0, row: 1 });
    expect(route).toContainEqual({ col: 3, row: 2 });
    expect(route).not.toContainEqual({ col: 3, row: 1 });
  });

  it('slows the only route instead when there is no alternative', () => {
    const line = ['.......', '##~~###', '.......', '.......', '.......'];
    const field = new PathField(7, 5, gridFrom(line), goal);
    expect(field.route({ col: 0, row: 1 })).toHaveLength(7);
    expect(field.distance({ col: 0, row: 1 })).toBe(8);
  });

  it('detects tiles cut off from the goal', () => {
    const cut = ['.......', '###.###', '.......', '.......', '.......'];
    const field = new PathField(7, 5, gridFrom(cut), goal);
    expect(field.isReachable({ col: 0, row: 1 })).toBe(false);
    expect(field.route({ col: 0, row: 1 })).toEqual([]);
    expect(field.next({ col: 0, row: 1 })).toBeUndefined();
    expect(field.isReachable({ col: 4, row: 1 })).toBe(true);
  });

  it('breaks ties the same way every time', () => {
    const open = ['.......', '.#####.', '.#####.', '.#####.', '.......'];
    const center = { col: 5, row: 2 };
    const a = new PathField(7, 5, gridFrom(open), center).route({ col: 1, row: 1 });
    const b = new PathField(7, 5, gridFrom(open), center).route({ col: 1, row: 1 });
    expect(a).toEqual(b);
    // Neighbour order is up, right, down, left: right wins ties before down.
    expect(a[1]).toEqual({ col: 2, row: 1 });
  });

  it('sees edits after a recompute', () => {
    const tiles = gridFrom(loop);
    let edited: TileCoord | undefined;
    const field = new PathField(7, 5, (t) => (edited && t.col === edited.col && t.row === edited.row ? 'ground' : tiles(t)), goal);
    edited = { col: 3, row: 1 };
    field.recompute();
    expect(field.route({ col: 0, row: 1 })).toContainEqual({ col: 3, row: 2 });
  });
});
