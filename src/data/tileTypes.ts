export type TileType = 'path' | 'gravel' | 'ground' | 'water' | 'fire' | 'ice';

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
  // Score (not scrap) multiplier for a kill whose enemy dies on this tile.
  killScoreMultiplier?: number;
  // Damage per second to every enemy on the tile, scaled with the wave like enemy HP.
  // Ignores armor: a per-step tick is only a few points, armor would floor it to 1.
  damagePerSec?: { base: number; perWave: number };
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
  // Routing ignores damage (speed ×1, like path), so enemies walk straight into it:
  // avoiding it would turn fire into an expensive wall.
  fire: {
    name: 'Fire',
    walkable: true,
    speedMultiplier: 1,
    editBaseCost: 100,
    unlockWave: 250,
    editKey: 'f',
    editHelp: 'Make fire (burns enemies on it)',
    damagePerSec: { base: 200, perWave: 20 },
  },
  // Risk for reward: enemies rush through, so they spend less time in range, but a kill
  // on ice scores more. Scrap is unchanged so it can't snowball the economy.
  ice: {
    name: 'Ice',
    walkable: true,
    speedMultiplier: 1.5,
    editBaseCost: 40,
    unlockWave: 0,
    editKey: 'i',
    editHelp: 'Make ice (speeds enemies, kills score ×5)',
    killScoreMultiplier: 5,
  },
};

export const TILE_TYPE_ORDER = Object.keys(TILE_TYPES) as readonly TileType[];

export function killScoreMultiplier(type: TileType | undefined): number {
  return (type && TILE_TYPES[type].killScoreMultiplier) || 1;
}
