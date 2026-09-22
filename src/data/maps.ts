export interface TileCoord {
  col: number;
  row: number;
}

export type MapId = 'crossroads' | 'serpent' | 'gauntlet';

export interface MapDefinition {
  id: MapId;
  name: string;
  difficulty: string;
  scoreMultiplier: number;
  // Consecutive waypoints must share a row or column: the path is built from straight
  // orthogonal segments. The first waypoint starts off-map so enemies walk in from the
  // edge; the last one is the shelter tile.
  waypoints: readonly TileCoord[];
}

export const MAPS: readonly MapDefinition[] = [
  {
    id: 'crossroads',
    name: 'Crossroads',
    difficulty: 'Easy',
    scoreMultiplier: 1,
    waypoints: [
      { col: -1, row: 3 },
      { col: 5, row: 3 },
      { col: 5, row: 13 },
      { col: 10, row: 13 },
      { col: 10, row: 5 },
      { col: 15, row: 5 },
      { col: 15, row: 14 },
      { col: 20, row: 14 },
      { col: 20, row: 8 },
      { col: 22, row: 8 },
    ],
  },
  {
    id: 'serpent',
    name: 'Serpent',
    difficulty: 'Medium',
    scoreMultiplier: 1.25,
    waypoints: [
      { col: -1, row: 4 },
      { col: 9, row: 4 },
      { col: 9, row: 11 },
      { col: 17, row: 11 },
      { col: 17, row: 7 },
      { col: 21, row: 7 },
    ],
  },
  {
    id: 'gauntlet',
    name: 'Gauntlet',
    difficulty: 'Hard',
    scoreMultiplier: 1.5,
    waypoints: [
      { col: -1, row: 8 },
      { col: 10, row: 8 },
      { col: 10, row: 11 },
      { col: 19, row: 11 },
    ],
  },
];

export function getMap(id: MapId): MapDefinition {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`Unknown map ${id}`);
  return map;
}

export function shelterTile(map: MapDefinition): TileCoord {
  return map.waypoints[map.waypoints.length - 1];
}
