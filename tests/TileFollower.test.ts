import { describe, expect, it } from 'vitest';
import type { TileCoord } from '../src/data/maps';
import { TileFollower, type TileNavigator } from '../src/systems/TileFollower';

// Tiles are 10 px; the route goes (0,0) → (1,0) → (1,1), goal at (1,1).
function navigator(routes: Record<string, TileCoord>): TileNavigator {
  return {
    tileToWorld: (t) => ({ x: t.col * 10 + 5, y: t.row * 10 + 5 }),
    next: (t) => routes[`${t.col},${t.row}`],
    isGoal: (t) => t.col === 1 && t.row === 1,
  };
}

describe('TileFollower', () => {
  const routes = { '0,0': { col: 1, row: 0 }, '1,0': { col: 1, row: 1 } };

  it('walks in from its start and carries leftover distance around corners', () => {
    const f = new TileFollower({ x: -5, y: 5 }, { col: 0, row: 0 }, navigator(routes));
    f.advance(25);
    expect({ x: f.x, y: f.y }).toEqual({ x: 15, y: 10 });
    expect(f.target).toEqual({ col: 1, row: 1 });
    expect(f.reachedEnd).toBe(false);
  });

  it('stops at the goal', () => {
    const f = new TileFollower({ x: 5, y: 5 }, { col: 0, row: 0 }, navigator(routes));
    f.advance(1000);
    expect({ x: f.x, y: f.y }).toEqual({ x: 15, y: 15 });
    expect(f.reachedEnd).toBe(true);
  });

  it('asks for the next tile on arrival, so reroutes apply mid-walk', () => {
    const live: Record<string, TileCoord> = { ...routes };
    const f = new TileFollower({ x: 5, y: 5 }, { col: 0, row: 0 }, navigator(live));
    live['0,0'] = { col: 0, row: 1 };
    live['0,1'] = { col: 1, row: 1 };
    f.advance(5);
    expect(f.target).toEqual({ col: 0, row: 1 });
    expect({ x: f.x, y: f.y }).toEqual({ x: 5, y: 10 });
  });

  it('waits in place when there is no next tile', () => {
    const f = new TileFollower({ x: 5, y: 5 }, { col: 0, row: 0 }, navigator({}));
    f.advance(50);
    expect({ x: f.x, y: f.y }).toEqual({ x: 5, y: 5 });
    expect(f.reachedEnd).toBe(false);
  });
});
