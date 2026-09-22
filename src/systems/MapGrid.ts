import type { TileCoord } from '../data/maps';

export interface Point {
  x: number;
  y: number;
}

export type TileType = 'path' | 'gravel' | 'ground';

// A map's waypoints only define its initial layout: path along them, ground everywhere
// else. The player can edit tile types afterwards; the entry and shelter tiles are fixed.
export class MapGrid {
  readonly entry: TileCoord;
  readonly leadIn: TileCoord;
  private readonly types: TileType[];
  private readonly occupiedTiles = new Set<string>();

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    waypoints: readonly TileCoord[],
    private readonly blockedTopRows: number,
    private readonly blockedBottomRows: number,
  ) {
    this.types = new Array<TileType>(cols * rows).fill('ground');
    this.leadIn = waypoints[0];
    this.entry = this.buildPath(waypoints);
  }

  get firstPlayableRow(): number {
    return this.blockedTopRows;
  }

  get lastPlayableRow(): number {
    return this.rows - this.blockedBottomRows - 1;
  }

  isInBounds(tile: TileCoord): boolean {
    return tile.col >= 0 && tile.col < this.cols && tile.row >= 0 && tile.row < this.rows;
  }

  isPlayable(tile: TileCoord): boolean {
    return this.isInBounds(tile) && tile.row >= this.firstPlayableRow && tile.row <= this.lastPlayableRow;
  }

  tileType(tile: TileCoord): TileType {
    return this.isInBounds(tile) ? this.types[this.index(tile)] : 'ground';
  }

  setTileType(tile: TileCoord, type: TileType): void {
    if (this.isInBounds(tile)) this.types[this.index(tile)] = type;
  }

  isPath(tile: TileCoord): boolean {
    return this.tileType(tile) === 'path';
  }

  isWalkable(tile: TileCoord): boolean {
    return this.isInBounds(tile) && this.tileType(tile) !== 'ground';
  }

  isOccupied(tile: TileCoord): boolean {
    return this.occupiedTiles.has(tileKey(tile));
  }

  isBuildable(tile: TileCoord): boolean {
    return this.isPlayable(tile) && this.tileType(tile) === 'ground' && !this.isOccupied(tile);
  }

  occupy(tile: TileCoord): void {
    this.occupiedTiles.add(tileKey(tile));
  }

  release(tile: TileCoord): void {
    this.occupiedTiles.delete(tileKey(tile));
  }

  tileToWorld(tile: TileCoord): Point {
    return {
      x: tile.col * this.tileSize + this.tileSize / 2,
      y: tile.row * this.tileSize + this.tileSize / 2,
    };
  }

  worldToTile(point: Point): TileCoord {
    return {
      col: Math.floor(point.x / this.tileSize),
      row: Math.floor(point.y / this.tileSize),
    };
  }

  private index(tile: TileCoord): number {
    return tile.row * this.cols + tile.col;
  }

  // Lays path tiles along the waypoints and returns the first in-bounds one (the entry).
  private buildPath(waypoints: readonly TileCoord[]): TileCoord {
    let entry: TileCoord | undefined;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      if (from.col !== to.col && from.row !== to.row) {
        throw new Error(`Path segment ${i} is not orthogonal`);
      }
      const stepCol = Math.sign(to.col - from.col);
      const stepRow = Math.sign(to.row - from.row);
      let col = from.col;
      let row = from.row;
      for (;;) {
        const tile = { col, row };
        if (this.isInBounds(tile)) {
          this.setTileType(tile, 'path');
          entry ??= tile;
        }
        if (col === to.col && row === to.row) break;
        col += stepCol;
        row += stepRow;
      }
    }
    if (!entry) throw new Error('Path never enters the map');
    return entry;
  }
}

export function tileKey(tile: TileCoord): string {
  return `${tile.col},${tile.row}`;
}

export function sameTile(a: TileCoord, b: TileCoord): boolean {
  return a.col === b.col && a.row === b.row;
}
