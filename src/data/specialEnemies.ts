import { ARMORED_ARMOR, SPLITTER_CHILD_REWARD_RATIO, SPLITTER_CHILD_SCALE } from '../config';
import type { TileType } from './tileTypes';

export type SpecialId = 'runner' | 'armored' | 'splitter' | 'swimmer' | 'healer' | 'jammer' | 'burrower' | 'carrier' | 'salamander';

// Heals other non-boss enemies in range by a share of their own max HP.
export interface HealAura {
  radius: number;
  ratioPerSec: number;
}

// Towers in range fire slower.
export interface JamAura {
  radius: number;
  cooldownMultiplier: number;
}

// Other enemies in range move faster and take less damage.
export interface WarAura {
  radius: number;
  speedMultiplier: number;
  damageTakenMultiplier: number;
}

export interface BurrowTrait {
  surfaceMs: number;
  undergroundMs: number;
}

export interface SpawnerTrait {
  // Children are built from T1 or from the strongest tier active that wave.
  child: 'weakest' | 'strongest';
  hpRatio: number;
  rewardRatio: number;
  scale?: number;
  everyMs: number;
  count: number;
  maxTimes: number;
}

export interface ReviveTrait {
  hpRatio: number;
  delayMs: number;
}

// Shared by specials and bosses; Enemy applies them generically, never by kind.
export interface EnemyTraitSet {
  armor?: number;
  // Tile types that don't slow this enemy.
  slowImmune?: readonly TileType[];
  splits?: boolean;
  fireproof?: boolean;
  healAura?: HealAura;
  jamAura?: JamAura;
  warAura?: WarAura;
  burrow?: BurrowTrait;
  spawner?: SpawnerTrait;
  revive?: ReviveTrait;
}

export interface SpecialEnemy {
  id: SpecialId;
  name: string;
  // Shown once per game, the first time one spawns: "New: <name> · <intro>".
  intro: string;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  appearsFrom: number;
  traits: EnemyTraitSet;
}

// One trait each, and each trait counters a different player tool: gravel, swarms of
// low-level turrets, killing enemies next to the shelter, slow-terrain mazes, chip damage,
// dense clusters, pure turret DPS and fire strips. Specials never retire.
export const SPECIAL_ENEMIES: readonly SpecialEnemy[] = [
  {
    id: 'runner',
    name: 'Runner',
    intro: 'fast, ignores gravel',
    hp: 40,
    speed: 110,
    damage: 10,
    reward: 20,
    appearsFrom: 6,
    traits: { slowImmune: ['gravel'] },
  },
  {
    id: 'armored',
    name: 'Armored',
    intro: 'armor soaks weak hits',
    hp: 150,
    speed: 40,
    damage: 25,
    reward: 40,
    appearsFrom: 9,
    traits: { armor: ARMORED_ARMOR },
  },
  {
    id: 'splitter',
    name: 'Splitter',
    intro: 'splits in two when killed',
    hp: 180,
    speed: 50,
    damage: 20,
    reward: 30,
    appearsFrom: 12,
    traits: { splits: true },
  },
  {
    id: 'swimmer',
    name: 'Swimmer',
    intro: 'not slowed by gravel or water',
    hp: 300,
    speed: 60,
    damage: 30,
    reward: 60,
    appearsFrom: 160,
    traits: { slowImmune: ['gravel', 'water'] },
  },
  {
    id: 'healer',
    name: 'Healer',
    intro: 'heals nearby enemies',
    hp: 500,
    speed: 45,
    damage: 20,
    reward: 80,
    appearsFrom: 180,
    traits: { healAura: { radius: 80, ratioPerSec: 0.03 } },
  },
  {
    id: 'jammer',
    name: 'Jammer',
    intro: 'nearby towers fire at half rate',
    hp: 600,
    speed: 50,
    damage: 30,
    reward: 90,
    appearsFrom: 200,
    traits: { jamAura: { radius: 100, cooldownMultiplier: 2 } },
  },
  {
    id: 'burrower',
    name: 'Burrower',
    intro: "dives underground, where towers can't hit it",
    hp: 800,
    speed: 55,
    damage: 40,
    reward: 100,
    appearsFrom: 210,
    traits: { burrow: { surfaceMs: 3000, undergroundMs: 2000 } },
  },
  {
    id: 'carrier',
    name: 'Carrier',
    intro: 'drops minions as it walks',
    hp: 1500,
    speed: 40,
    damage: 60,
    reward: 150,
    appearsFrom: 230,
    traits: {
      spawner: {
        child: 'weakest',
        hpRatio: 1,
        rewardRatio: SPLITTER_CHILD_REWARD_RATIO,
        scale: SPLITTER_CHILD_SCALE,
        everyMs: 4000,
        count: 2,
        maxTimes: 5,
      },
    },
  },
  {
    id: 'salamander',
    name: 'Salamander',
    intro: 'fireproof',
    hp: 1000,
    speed: 60,
    damage: 50,
    reward: 120,
    appearsFrom: 260,
    traits: { fireproof: true },
  },
];
