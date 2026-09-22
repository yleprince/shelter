import type { Point } from './MapGrid';

export class PathFollower {
  private targetIndex = 1;
  private readonly position: Point;

  constructor(private readonly waypoints: readonly Point[]) {
    if (waypoints.length < 2) throw new Error('Path needs at least two waypoints');
    this.position = { ...waypoints[0] };
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get reachedEnd(): boolean {
    return this.targetIndex >= this.waypoints.length;
  }

  advance(distance: number): void {
    let remaining = distance;
    while (remaining > 0 && !this.reachedEnd) {
      const target = this.waypoints[this.targetIndex];
      const dx = target.x - this.position.x;
      const dy = target.y - this.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= remaining) {
        this.position.x = target.x;
        this.position.y = target.y;
        remaining -= dist;
        this.targetIndex++;
      } else {
        this.position.x += (dx / dist) * remaining;
        this.position.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }
  }
}
