// The JSON contract between the game and the API server (`server/`).

export interface GameSubmission {
  // null: played without a name, stored but kept off the leaderboard.
  username: string | null;
  mapId: string;
  score: number;
  wave: number;
  kills: number;
  // Simulated time survived (what the score counts), independent of game speed.
  survivalSeconds: number;
  // Real time from the first frame to game over, pauses included.
  durationMs: number;
}

export interface GameRecord extends GameSubmission {
  id: number;
  // Stamped by the server when the game is saved (ISO 8601, UTC).
  playedAt: string;
}

export interface SaveResult {
  id: number;
  // The player's rank on the all-maps leaderboard (by their best game); null when anonymous.
  rank: number | null;
  players: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  mapId: string;
  wave: number;
  playedAt: string;
}
