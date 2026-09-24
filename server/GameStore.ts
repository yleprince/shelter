import { DatabaseSync } from 'node:sqlite';
import type { GameRecord, GameSubmission, LeaderboardEntry, SaveResult } from '../shared/api.ts';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS games (
    id               INTEGER PRIMARY KEY,
    username         TEXT COLLATE NOCASE,
    map_id           TEXT NOT NULL,
    score            INTEGER NOT NULL,
    wave             INTEGER NOT NULL,
    kills            INTEGER NOT NULL,
    survival_seconds INTEGER NOT NULL,
    duration_ms      INTEGER NOT NULL,
    played_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS games_by_player ON games (username, score DESC);
  CREATE INDEX IF NOT EXISTS games_by_map ON games (map_id, score DESC);
`;

interface GameRow {
  id: number;
  username: string | null;
  map_id: string;
  score: number;
  wave: number;
  kills: number;
  survival_seconds: number;
  duration_ms: number;
  played_at: string;
}

interface BestRow {
  username: string;
  score: number;
  map_id: string;
  wave: number;
  played_at: string;
}

// Every finished game is one row. The leaderboard is derived: each named player's best game.
// Names compare case-insensitively (NOCASE), so "Bob" and "bob" are one player.
export class GameStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    // One process, one connection, synchronous calls: nothing ever contends for a lock, so
    // the default journal is enough and the database stays one file (easy to back up).
    this.db = new DatabaseSync(path);
    this.db.exec(SCHEMA);
  }

  save(game: GameSubmission, playedAt: Date): SaveResult {
    const { lastInsertRowid } = this.db
      .prepare(
        `INSERT INTO games (username, map_id, score, wave, kills, survival_seconds, duration_ms, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(game.username, game.mapId, game.score, game.wave, game.kills, game.survivalSeconds, game.durationMs, playedAt.toISOString());
    const players = this.playerCount();
    return { id: Number(lastInsertRowid), rank: game.username === null ? null : this.rankOf(game.username), players };
  }

  leaderboard(limit: number, mapId: string | null): LeaderboardEntry[] {
    // SQLite fills bare columns next to a lone MAX() from the row holding the max, so map,
    // wave and date belong to each player's best game. Ties go to whoever got there first.
    const rows = this.db
      .prepare(
        `SELECT username, MAX(score) AS score, map_id, wave, played_at
         FROM games
         WHERE username IS NOT NULL AND (?1 IS NULL OR map_id = ?1)
         GROUP BY username
         ORDER BY score DESC, played_at ASC
         LIMIT ?2`,
      )
      .all(mapId, limit) as unknown as BestRow[];
    // Competition ranking (1, 2, 2, 4), matching rankOf().
    let rank = 0;
    return rows.map((row, i) => {
      if (i === 0 || row.score < rows[i - 1].score) rank = i + 1;
      return { rank, username: row.username, score: row.score, mapId: row.map_id, wave: row.wave, playedAt: row.played_at };
    });
  }

  recentGames(username: string, limit: number): GameRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM games WHERE username = ? ORDER BY id DESC LIMIT ?')
      .all(username, limit) as unknown as GameRow[];
    return rows.map(toRecord);
  }

  close(): void {
    this.db.close();
  }

  private playerCount(): number {
    const row = this.db.prepare('SELECT COUNT(DISTINCT username) AS n FROM games').get() as { n: number };
    return row.n;
  }

  private rankOf(username: string): number {
    const row = this.db
      .prepare(
        `WITH best AS (
           SELECT username, MAX(score) AS score FROM games WHERE username IS NOT NULL GROUP BY username
         )
         SELECT 1 + COUNT(*) AS rank FROM best
         WHERE score > (SELECT score FROM best WHERE username = ?1) AND username <> ?1`,
      )
      .get(username) as { rank: number };
    return row.rank;
  }
}

function toRecord(row: GameRow): GameRecord {
  return {
    id: row.id,
    username: row.username,
    mapId: row.map_id,
    score: row.score,
    wave: row.wave,
    kills: row.kills,
    survivalSeconds: row.survival_seconds,
    durationMs: row.duration_ms,
    playedAt: row.played_at,
  };
}
