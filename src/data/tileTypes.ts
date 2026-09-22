export type TileType = 'path' | 'gravel' | 'ground' | 'water';

export interface TileTypeDef {
  name: string;
  walkable: boolean;
  // Enemy speed on this tile; routing costs 1 / speedMultiplier per tile.
  speedMultiplier: number;
  // Scrap spent on edits is gone for good (no refunds), like repair.
  editBaseCost: number;
  unlockWave: number;
  // The key typed after `r` to turn the cursor tile into this type.
  editKey: string;
  editHelp: string;
}

// Key order is display order: the tile panel, the `r…` status hint and the help list.
export const TILE_TYPES: Readonly<Record<TileType, TileTypeDef>> = {
  path: {
    name: 'Path',
    walkable: true,
    speedMultiplier: 1,
    editBaseCost: 15,
    unlockWave: 0,
    editKey: 'p',
    editHelp: 'Make path',
  },
  gravel: {
    name: 'Gravel',
    walkable: true,
    speedMultiplier: 0.5,
    editBaseCost: 30,
    unlockWave: 0,
    editKey: 'g',
    editHelp: 'Make gravel (slows enemies)',
  },
  ground: {
    name: 'Ground',
    walkable: false,
    speedMultiplier: 1,
    editBaseCost: 20,
    unlockWave: 0,
    editKey: 'b',
    editHelp: 'Make buildable ground',
  },
  // Unlocks late so it answers runners, which ignore gravel but not water.
  water: {
    name: 'Water',
    walkable: true,
    speedMultiplier: 0.25,
    editBaseCost: 60,
    unlockWave: 150,
    editKey: 'w',
    editHelp: 'Make water (slows even runners)',
  },
};

export const TILE_TYPE_ORDER = Object.keys(TILE_TYPES) as readonly TileType[];
