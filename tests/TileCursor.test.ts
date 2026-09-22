import { describe, expect, it } from 'vitest';
import { TileCursor } from '../src/systems/TileCursor';

const bounds = { cols: 24, firstRow: 2, lastRow: 14 };

describe('TileCursor', () => {
  it('starts where asked, clamped to the playable area', () => {
    expect(new TileCursor(bounds, { col: 5, row: 7 }).tile).toEqual({ col: 5, row: 7 });
    expect(new TileCursor(bounds, { col: 30, row: 0 }).tile).toEqual({ col: 23, row: 2 });
  });

  it('moves and clamps at every edge, never entering the HUD or status rows', () => {
    const cursor = new TileCursor(bounds, { col: 1, row: 3 });
    cursor.move(-5, 0);
    expect(cursor.tile).toEqual({ col: 0, row: 3 });
    cursor.move(0, -5);
    expect(cursor.tile).toEqual({ col: 0, row: 2 });
    cursor.move(100, 100);
    expect(cursor.tile).toEqual({ col: 23, row: 14 });
  });

  it('jumps to row ends and to the top and bottom rows', () => {
    const cursor = new TileCursor(bounds, { col: 7, row: 9 });
    cursor.rowEnd();
    expect(cursor.tile).toEqual({ col: 23, row: 9 });
    cursor.rowStart();
    expect(cursor.tile).toEqual({ col: 0, row: 9 });
    cursor.top();
    expect(cursor.tile).toEqual({ col: 0, row: 2 });
    cursor.bottom();
    expect(cursor.tile).toEqual({ col: 0, row: 14 });
  });

  it('reports whether a tile is inside the playable area', () => {
    const cursor = new TileCursor(bounds, { col: 0, row: 2 });
    expect(cursor.contains({ col: 23, row: 14 })).toBe(true);
    expect(cursor.contains({ col: 3, row: 1 })).toBe(false);
    expect(cursor.contains({ col: 3, row: 15 })).toBe(false);
    expect(cursor.contains({ col: 24, row: 5 })).toBe(false);
  });

  it('cycles through towers in reading order, both ways, wrapping around', () => {
    const towers = [
      { col: 10, row: 8 },
      { col: 2, row: 8 },
      { col: 20, row: 3 },
    ];
    const cursor = new TileCursor(bounds, { col: 5, row: 8 });
    cursor.nextTower(towers);
    expect(cursor.tile).toEqual({ col: 10, row: 8 });
    cursor.nextTower(towers);
    expect(cursor.tile).toEqual({ col: 20, row: 3 });
    cursor.prevTower(towers);
    expect(cursor.tile).toEqual({ col: 10, row: 8 });
    cursor.prevTower(towers);
    expect(cursor.tile).toEqual({ col: 2, row: 8 });
    cursor.prevTower(towers);
    expect(cursor.tile).toEqual({ col: 20, row: 3 });
  });

  it('stays put when there are no towers', () => {
    const cursor = new TileCursor(bounds, { col: 5, row: 8 });
    cursor.nextTower([]);
    expect(cursor.tile).toEqual({ col: 5, row: 8 });
  });
});
