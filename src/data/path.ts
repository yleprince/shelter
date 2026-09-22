export interface TileCoord {
  col: number;
  row: number;
}

// Consecutive waypoints must share a row or column: the path is built from straight
// orthogonal segments. The first waypoint starts off-map so enemies walk in from the edge.
export const PATH_WAYPOINTS: readonly TileCoord[] = [
  { col: -1, row: 3 },
  { col: 5, row: 3 },
  { col: 5, row: 12 },
  { col: 10, row: 12 },
  { col: 10, row: 5 },
  { col: 15, row: 5 },
  { col: 15, row: 13 },
  { col: 20, row: 13 },
  { col: 20, row: 8 },
  { col: 22, row: 8 },
];

export const SHELTER_TILE: TileCoord = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
