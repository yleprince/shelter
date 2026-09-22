import type { TileCoord } from '../data/maps';
import { TILE_TYPES } from '../data/tileTypes';
import type { TileType } from './MapGrid';

export type TileTypeLookup = (tile: TileCoord) => TileType;

// Fixed order so ties always resolve the same way: the route is deterministic.
const NEIGHBOURS: readonly TileCoord[] = [
  { col: 0, row: -1 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
];

export function stepCost(type: TileType): number {
  const def = TILE_TYPES[type];
  return def.walkable ? 1 / def.speedMultiplier : Infinity;
}

// Dijkstra from the goal over walkable tiles, so every tile knows its fastest way to the
// shelter. Moving between two tile centres spends half the distance on each tile, so an
// edge costs the average of both tiles' step costs.
export class PathField {
  private readonly dist: Float64Array;

  constructor(
    private readonly cols: number,
    private readonly rows: number,
    private readonly typeAt: TileTypeLookup,
    readonly goal: TileCoord,
  ) {
    this.dist = new Float64Array(cols * rows);
    this.recompute();
  }

  recompute(): void {
    this.dist.fill(Infinity);
    if (!this.isWalkable(this.goal)) return;
    const done = new Uint8Array(this.cols * this.rows);
    this.dist[this.index(this.goal)] = 0;
    // The grid is tiny (24 × 16), so a linear scan for the closest open tile is plenty.
    for (;;) {
      let best = -1;
      for (let i = 0; i < this.dist.length; i++) {
        if (!done[i] && this.dist[i] < Infinity && (best < 0 || this.dist[i] < this.dist[best])) best = i;
      }
      if (best < 0) return;
      done[best] = 1;
      const tile = { col: best % this.cols, row: Math.floor(best / this.cols) };
      for (const n of this.neighbours(tile)) {
        const d = this.dist[best] + this.edgeCost(tile, n);
        const ni = this.index(n);
        if (d < this.dist[ni]) this.dist[ni] = d;
      }
    }
  }

  distance(tile: TileCoord): number {
    return this.inBounds(tile) ? this.dist[this.index(tile)] : Infinity;
  }

  isReachable(tile: TileCoord): boolean {
    return this.distance(tile) < Infinity;
  }

  // The next tile toward the goal, or undefined at the goal or when cut off from it.
  next(tile: TileCoord): TileCoord | undefined {
    const here = this.distance(tile);
    if (here === 0 || here === Infinity) return undefined;
    let best: TileCoord | undefined;
    let bestDist = Infinity;
    for (const n of this.neighbours(tile)) {
      const d = this.distance(n) + this.edgeCost(tile, n);
      if (d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    return best;
  }

  // Tiles from `from` to the goal, both included; empty if unreachable.
  route(from: TileCoord): TileCoord[] {
    if (!this.isReachable(from)) return [];
    const tiles = [from];
    for (let tile = this.next(from); tile; tile = this.next(tile)) tiles.push(tile);
    return tiles;
  }

  private neighbours(tile: TileCoord): TileCoord[] {
    return NEIGHBOURS.map((d) => ({ col: tile.col + d.col, row: tile.row + d.row })).filter((n) =>
      this.isWalkable(n),
    );
  }

  private edgeCost(a: TileCoord, b: TileCoord): number {
    return (stepCost(this.typeAt(a)) + stepCost(this.typeAt(b))) / 2;
  }

  private isWalkable(tile: TileCoord): boolean {
    return this.inBounds(tile) && TILE_TYPES[this.typeAt(tile)].walkable;
  }

  private inBounds(tile: TileCoord): boolean {
    return tile.col >= 0 && tile.col < this.cols && tile.row >= 0 && tile.row < this.rows;
  }

  private index(tile: TileCoord): number {
    return tile.row * this.cols + tile.col;
  }
}
