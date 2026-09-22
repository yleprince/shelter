import type { TileCoord } from '../data/maps';
import type { Point } from './MapGrid';

export interface TileNavigator {
  tileToWorld(tile: TileCoord): Point;
  // Asked each time the follower reaches a tile centre, so route changes apply at once.
  next(tile: TileCoord): TileCoord | undefined;
  isGoal(tile: TileCoord): boolean;
}

// Walks tile centre to tile centre, asking the navigator for the next tile on arrival.
export class TileFollower {
  private readonly position: Point;
  private targetTile: TileCoord;
  private arrived = false;

  constructor(
    start: Point,
    target: TileCoord,
    private readonly nav: TileNavigator,
  ) {
    this.position = { ...start };
    this.targetTile = target;
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get target(): TileCoord {
    return this.targetTile;
  }

  get reachedEnd(): boolean {
    return this.arrived;
  }

  advance(distance: number): void {
    let remaining = distance;
    while (remaining > 0 && !this.arrived) {
      const target = this.nav.tileToWorld(this.targetTile);
      const dx = target.x - this.position.x;
      const dy = target.y - this.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > remaining) {
        this.position.x += (dx / dist) * remaining;
        this.position.y += (dy / dist) * remaining;
        return;
      }
      this.position.x = target.x;
      this.position.y = target.y;
      remaining -= dist;
      if (this.nav.isGoal(this.targetTile)) {
        this.arrived = true;
        return;
      }
      const next = this.nav.next(this.targetTile);
      // Edits never cut an enemy off from the shelter, but never loop forever if one did.
      if (!next) return;
      this.targetTile = next;
    }
  }
}
