import { describe, expect, it } from 'vitest';
import { PathFollower } from '../src/systems/PathFollower';

describe('PathFollower', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('carries leftover distance around corners', () => {
    const f = new PathFollower(path);
    f.advance(15);
    expect(f.x).toBe(10);
    expect(f.y).toBe(5);
    expect(f.reachedEnd).toBe(false);
  });

  it('stops at the end of the path', () => {
    const f = new PathFollower(path);
    f.advance(1000);
    expect({ x: f.x, y: f.y }).toEqual({ x: 10, y: 10 });
    expect(f.reachedEnd).toBe(true);
  });
});
