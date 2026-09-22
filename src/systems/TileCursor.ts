import type { TileCoord } from '../data/maps';

export interface CursorBounds {
  cols: number;
  firstRow: number;
  lastRow: number;
}

// The keyboard cursor over the play area. The mouse drives the same position.
export class TileCursor {
  private current: TileCoord;

  constructor(
    private readonly bounds: CursorBounds,
    start: TileCoord,
  ) {
    this.current = this.clamp(start);
  }

  get tile(): TileCoord {
    return { ...this.current };
  }

  contains(tile: TileCoord): boolean {
    const { cols, firstRow, lastRow } = this.bounds;
    return tile.col >= 0 && tile.col < cols && tile.row >= firstRow && tile.row <= lastRow;
  }

  set(tile: TileCoord): void {
    this.current = this.clamp(tile);
  }

  move(dCol: number, dRow: number): void {
    this.set({ col: this.current.col + dCol, row: this.current.row + dRow });
  }

  rowStart(): void {
    this.set({ col: 0, row: this.current.row });
  }

  rowEnd(): void {
    this.set({ col: this.bounds.cols - 1, row: this.current.row });
  }

  top(): void {
    this.set({ col: this.current.col, row: this.bounds.firstRow });
  }

  bottom(): void {
    this.set({ col: this.current.col, row: this.bounds.lastRow });
  }

  // Jumps to the next tower in reading order (row by row, left to right), wrapping around.
  nextTower(towers: readonly TileCoord[]): void {
    this.jumpTower(towers, 1);
  }

  prevTower(towers: readonly TileCoord[]): void {
    this.jumpTower(towers, -1);
  }

  private jumpTower(towers: readonly TileCoord[], direction: 1 | -1): void {
    if (towers.length === 0) return;
    const order = (t: TileCoord) => t.row * this.bounds.cols + t.col;
    const here = order(this.current);
    const sorted = [...towers].sort((a, b) => order(a) - order(b));
    const target =
      direction === 1
        ? (sorted.find((t) => order(t) > here) ?? sorted[0])
        : ([...sorted].reverse().find((t) => order(t) < here) ?? sorted[sorted.length - 1]);
    this.set(target);
  }

  private clamp(tile: TileCoord): TileCoord {
    const { cols, firstRow, lastRow } = this.bounds;
    return {
      col: Math.min(Math.max(tile.col, 0), cols - 1),
      row: Math.min(Math.max(tile.row, firstRow), lastRow),
    };
  }
}
