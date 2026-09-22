import { describe, expect, it } from 'vitest';
import { TILE_EDIT_BASE_COST, TILE_EDIT_COST_PER_WAVE } from '../src/config';
import { MapGrid } from '../src/systems/MapGrid';
import { editBlocker, editCost, type EditContext } from '../src/systems/TileEditor';

// 8×8, HUD row 0, status row 7. Path: in from the left on row 2, down column 3 to the
// shelter at (3,5), plus a parallel loop via row 3.
function setup(overrides: Partial<EditContext> = {}): EditContext {
  const grid = new MapGrid(8, 8, 10, [{ col: -1, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 5 }], 1, 1);
  const shelter = { col: 3, row: 5 };
  grid.occupy(shelter);
  return { grid, shelter, enemyTiles: [], wave: 0, balance: 1000, ...overrides };
}

describe('editCost', () => {
  it('adds the per-wave increase to each type base cost', () => {
    expect(editCost('gravel', 0)).toBe(TILE_EDIT_BASE_COST.gravel);
    expect(editCost('path', 7)).toBe(TILE_EDIT_BASE_COST.path + 7 * TILE_EDIT_COST_PER_WAVE);
  });
});

describe('editBlocker', () => {
  it('allows ordinary edits', () => {
    const ctx = setup();
    expect(editBlocker({ col: 6, row: 4 }, 'path', ctx)).toBeNull();
    expect(editBlocker({ col: 2, row: 2 }, 'gravel', ctx)).toBeNull();
  });

  it('refuses the HUD rows, the status row and out-of-bounds tiles', () => {
    const ctx = setup();
    expect(editBlocker({ col: 5, row: 0 }, 'path', ctx)).toBe('not-playable');
    expect(editBlocker({ col: 5, row: 7 }, 'path', ctx)).toBe('not-playable');
    expect(editBlocker({ col: 9, row: 3 }, 'path', ctx)).toBe('not-playable');
  });

  it('keeps the shelter tile fixed and the entry walkable', () => {
    const ctx = setup();
    expect(editBlocker(ctx.shelter, 'gravel', ctx)).toBe('shelter');
    expect(editBlocker(ctx.grid.entry, 'ground', ctx)).toBe('entry');
    expect(editBlocker(ctx.grid.entry, 'gravel', ctx)).toBeNull();
  });

  it('refuses tiles with a tower and no-op edits', () => {
    const ctx = setup();
    ctx.grid.occupy({ col: 6, row: 4 });
    expect(editBlocker({ col: 6, row: 4 }, 'path', ctx)).toBe('tower');
    expect(editBlocker({ col: 1, row: 2 }, 'path', ctx)).toBe('same-type');
  });

  it('refuses to turn a tile under or ahead of an enemy into ground', () => {
    const ctx = setup({ enemyTiles: [{ col: 1, row: 2 }, { col: 2, row: 2 }] });
    // Give the route an alternative so the refusal is about the enemy, not connectivity.
    for (const col of [1, 2, 3]) ctx.grid.setTileType({ col, row: 3 }, 'path');
    expect(editBlocker({ col: 2, row: 2 }, 'ground', ctx)).toBe('enemy');
    expect(editBlocker({ col: 2, row: 2 }, 'gravel', ctx)).toBeNull();
  });

  it('refuses edits that cut the entry, or any enemy, off from the shelter', () => {
    const ctx = setup();
    expect(editBlocker({ col: 3, row: 3 }, 'ground', ctx)).toBe('disconnects');

    // A dead-end branch off the route: cutting it is fine, unless an enemy stands on it.
    ctx.grid.setTileType({ col: 4, row: 3 }, 'path');
    ctx.grid.setTileType({ col: 5, row: 3 }, 'path');
    expect(editBlocker({ col: 4, row: 3 }, 'ground', ctx)).toBeNull();
    const stranded = { ...ctx, enemyTiles: [{ col: 5, row: 3 }] };
    expect(editBlocker({ col: 4, row: 3 }, 'ground', stranded)).toBe('disconnects');
  });

  it('checks the price last', () => {
    const ctx = setup({ balance: editCost('gravel', 3) - 1, wave: 3 });
    expect(editBlocker({ col: 2, row: 2 }, 'gravel', ctx)).toBe('too-expensive');
    expect(editBlocker({ col: 2, row: 2 }, 'path', ctx)).toBe('same-type');
  });
});
