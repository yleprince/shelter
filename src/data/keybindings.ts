import { GAME_SPEEDS } from '../config';
import { TILE_TYPE_ORDER, TILE_TYPES, type TileType } from './tileTypes';

// Single source of truth for keyboard controls: scenes resolve keys through this table
// and the help overlays are generated from it, so the two can't drift apart.
// Keys are KeyboardEvent.key values ('h', 'H', '$', '?', 'Enter'), with ' ' written as
// 'Space'. A sequence of several keys is typed in order, like vim's gg or dd.

export type BindingScene = 'game' | 'mapSelect' | 'gameOver';
export type BindingGroup = 'Move' | 'Build' | 'Tiles' | 'Game' | 'Menu';

export type GameAction =
  | 'moveLeft'
  | 'moveDown'
  | 'moveUp'
  | 'moveRight'
  | 'moveLeftFar'
  | 'moveDownFar'
  | 'moveUpFar'
  | 'moveRightFar'
  | 'rowStart'
  | 'rowEnd'
  | 'top'
  | 'bottom'
  | 'nextTower'
  | 'prevTower'
  | 'toShelter'
  | 'context'
  | 'place'
  | 'upgrade'
  | 'upgradeMax'
  | 'sell'
  | TileEditAction
  | 'pause'
  | 'speed1'
  | 'speed2'
  | 'speed3'
  | 'speed4'
  | 'repair'
  | 'upgradeShelter'
  | 'nextWave'
  | 'help'
  | 'cancel';

export type TileEditAction = `tile${Capitalize<TileType>}`;

export function tileEditAction(type: TileType): TileEditAction {
  return `tile${type[0].toUpperCase()}${type.slice(1)}` as TileEditAction;
}

export type MapSelectAction = 'prevMap' | 'nextMap' | 'startMap' | 'map1' | 'map2' | 'map3' | 'help' | 'cancel';

export type GameOverAction = 'retry' | 'changeMap';

export type KeyAction = GameAction | MapSelectAction | GameOverAction;

export interface KeyBinding<A extends KeyAction = KeyAction> {
  scene: BindingScene;
  group: BindingGroup;
  // Alternatives: any one of these sequences triggers the action.
  sequences: readonly (readonly string[])[];
  action: A;
  description: string;
  // Holding the key down repeats the action (movement only: a held d must never sell).
  repeatable?: boolean;
}

const seq = (...alternatives: string[]): string[][] => alternatives.map((s) => (s.length > 1 && !isNamedKey(s) ? [...s] : [s]));

function isNamedKey(key: string): boolean {
  return /^[A-Z][a-z]/.test(key);
}

const game = (
  group: BindingGroup,
  action: GameAction,
  sequences: string[][],
  description: string,
  repeatable = false,
): KeyBinding<GameAction> => ({ scene: 'game', group, sequences, action, description, repeatable });

export const GAME_BINDINGS: readonly KeyBinding<GameAction>[] = [
  game('Move', 'moveLeft', seq('h', 'ArrowLeft'), 'Cursor left', true),
  game('Move', 'moveDown', seq('j', 'ArrowDown'), 'Cursor down', true),
  game('Move', 'moveUp', seq('k', 'ArrowUp'), 'Cursor up', true),
  game('Move', 'moveRight', seq('l', 'ArrowRight'), 'Cursor right', true),
  game('Move', 'moveLeftFar', seq('H'), 'Cursor left 5', true),
  game('Move', 'moveDownFar', seq('J'), 'Cursor down 5', true),
  game('Move', 'moveUpFar', seq('K'), 'Cursor up 5', true),
  game('Move', 'moveRightFar', seq('L'), 'Cursor right 5', true),
  game('Move', 'rowStart', seq('0'), 'First column'),
  game('Move', 'rowEnd', seq('$'), 'Last column'),
  game('Move', 'top', seq('gg'), 'Top row'),
  game('Move', 'bottom', seq('G'), 'Bottom row'),
  game('Move', 'nextTower', seq('w'), 'Next tower', true),
  game('Move', 'prevTower', seq('b'), 'Previous tower', true),
  game('Move', 'toShelter', seq('gs'), 'Jump to shelter'),
  game('Build', 'context', seq('Enter'), 'Place turret / open tower panel'),
  game('Build', 'place', seq('i'), 'Place turret'),
  game('Build', 'upgrade', seq('u'), 'Upgrade tower / shelter one level'),
  game('Build', 'upgradeMax', seq('U'), 'Upgrade to the highest level available'),
  game('Build', 'sell', seq('dd'), 'Sell tower'),
  ...TILE_TYPE_ORDER.map((type) =>
    game('Tiles', tileEditAction(type), seq(`r${TILE_TYPES[type].editKey}`), TILE_TYPES[type].editHelp),
  ),
  game('Game', 'pause', seq('Space'), 'Pause / resume'),
  game('Game', 'speed1', seq('1'), `Speed x${GAME_SPEEDS[0]}`),
  game('Game', 'speed2', seq('2'), `Speed x${GAME_SPEEDS[1]}`),
  game('Game', 'speed3', seq('3'), `Speed x${GAME_SPEEDS[2]}`),
  game('Game', 'speed4', seq('4'), `Speed x${GAME_SPEEDS[3]}`),
  game('Game', 'repair', seq('R'), 'Repair shelter'),
  game('Game', 'upgradeShelter', seq('S'), 'Upgrade shelter one level'),
  game('Game', 'nextWave', seq('n'), 'Next wave now'),
  game('Game', 'help', seq('?'), 'Toggle this help'),
  game('Game', 'cancel', seq('Escape'), 'Cancel keys / close panel'),
];

const mapSelect = (action: MapSelectAction, sequences: string[][], description: string): KeyBinding<MapSelectAction> => ({
  scene: 'mapSelect',
  group: 'Menu',
  sequences,
  action,
  description,
  repeatable: action === 'prevMap' || action === 'nextMap',
});

export const MAP_SELECT_BINDINGS: readonly KeyBinding<MapSelectAction>[] = [
  mapSelect('prevMap', seq('h', 'k', 'ArrowLeft', 'ArrowUp'), 'Previous map'),
  mapSelect('nextMap', seq('l', 'j', 'ArrowRight', 'ArrowDown'), 'Next map'),
  mapSelect('startMap', seq('Enter'), 'Play the highlighted map'),
  mapSelect('map1', seq('1'), 'Play map 1'),
  mapSelect('map2', seq('2'), 'Play map 2'),
  mapSelect('map3', seq('3'), 'Play map 3'),
  mapSelect('help', seq('?'), 'Toggle this help'),
  mapSelect('cancel', seq('Escape'), 'Close help'),
];

export const GAME_OVER_BINDINGS: readonly KeyBinding<GameOverAction>[] = [
  { scene: 'gameOver', group: 'Menu', sequences: seq('Space', 'Enter'), action: 'retry', description: 'Retry this map' },
  { scene: 'gameOver', group: 'Menu', sequences: seq('m'), action: 'changeMap', description: 'Change map' },
];

export const KEY_BINDINGS: readonly KeyBinding[] = [...GAME_BINDINGS, ...MAP_SELECT_BINDINGS, ...GAME_OVER_BINDINGS];

const KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowLeft: '←',
  ArrowDown: '↓',
  ArrowUp: '↑',
  ArrowRight: '→',
  Escape: 'Esc',
};

export function sequenceLabel(sequence: readonly string[]): string {
  return sequence.map((key) => KEY_LABELS[key] ?? key).join('');
}

export function bindingLabel(binding: KeyBinding): string {
  return binding.sequences.map(sequenceLabel).join(' ');
}

export function keyHint(bindings: readonly KeyBinding[], action: KeyAction): string {
  const binding = bindings.find((b) => b.action === action);
  return binding ? sequenceLabel(binding.sequences[0]) : '';
}
