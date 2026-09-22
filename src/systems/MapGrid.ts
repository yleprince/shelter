import type { TileCoord } from '../data/maps';

export interface Point {
  x: number;
  y: number;
}

export class MapGrid {
  private readonly pathTiles = new Set<string>();
  private readonly occupiedTiles = new Set<string>();

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    private readonly waypoints: readonly TileCoord[],
    private readonly blockedTopRows: number,
  ) {
    this.buildPathTiles();
  }

  isInBounds(tile: TileCoord): boolean {
    return tile.col >= 0 && tile.col < this.cols && tile.row >= 0 && tile.row < this.rows;
  }

  isPath(tile: TileCoord): boolean {
    return this.pathTiles.has(key(tile));
  }

  isOccupied(tile: TileCoord): boolean {
    return this.occupiedTiles.has(key(tile));
  }

  isBuildable(tile: TileCoord): boolean {
    return (
      this.isInBounds(tile) &&
      tile.row >= this.blockedTopRows &&
      !this.isPath(tile) &&
      !this.isOccupied(tile)
    );
  }

  occupy(tile: TileCoord): void {
    this.occupiedTiles.add(key(tile));
  }

  release(tile: TileCoord): void {
    this.occupiedTiles.delete(key(tile));
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

  worldWaypoints(): Point[] {
    return this.waypoints.map((tile) => this.tileToWorld(tile));
  }

  private buildPathTiles(): void {
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const from = this.waypoints[i];
      const to = this.waypoints[i + 1];
      if (from.col !== to.col && from.row !== to.row) {
        throw new Error(`Path segment ${i} is not orthogonal`);
      }
      const stepCol = Math.sign(to.col - from.col);
      const stepRow = Math.sign(to.row - from.row);
      let col = from.col;
      let row = from.row;
      for (;;) {
        const tile = { col, row };
        if (this.isInBounds(tile)) this.pathTiles.add(key(tile));
        if (col === to.col && row === to.row) break;
        col += stepCol;
        row += stepRow;
      }
    }
  }
}

function key(tile: TileCoord): string {
  return `${tile.col},${tile.row}`;
}
