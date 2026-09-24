import { USERNAME_MAX_LENGTH } from '../../shared/username';
import type { GameRecord, LeaderboardEntry, SaveResult } from '../../shared/api';
import { MAPS } from '../data/maps';
import { formatScore } from './BestScore';

const MAP_COLUMN = Math.max(...MAPS.map((m) => m.name.length));
const SCORE_COLUMN = 11;

export function mapName(mapId: string): string {
  return MAPS.find((m) => m.id === mapId)?.name ?? mapId;
}

export function sameUsername(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

// Local time, to the minute: "2026-09-23 14:05".
export function formatPlayedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

export const LEADERBOARD_HEADER =
  `  ${'#'.padEnd(4)} ${'Name'.padEnd(USERNAME_MAX_LENGTH)} ${'Score'.padStart(SCORE_COLUMN)}  ` +
  `${'Map'.padEnd(MAP_COLUMN)} ${'Wave'.padStart(5)}  Date`;

// The viewer's own row is marked, so they can find themselves in the list.
export function leaderboardLine(entry: LeaderboardEntry, viewer: string | null): string {
  const marker = sameUsername(entry.username, viewer) ? '▶ ' : '  ';
  return (
    `${marker}${String(entry.rank).padEnd(4)} ${entry.username.padEnd(USERNAME_MAX_LENGTH)} ` +
    `${formatScore(entry.score).padStart(SCORE_COLUMN)}  ${mapName(entry.mapId).padEnd(MAP_COLUMN)} ` +
    `${String(entry.wave).padStart(5)}  ${formatPlayedAt(entry.playedAt).slice(0, 10)}`
  );
}

export function recentGameLine(game: GameRecord): string {
  return (
    `${formatPlayedAt(game.playedAt)}  ${mapName(game.mapId).padEnd(MAP_COLUMN)} ` +
    `${formatScore(game.score).padStart(SCORE_COLUMN)}  wave ${String(game.wave).padEnd(4)} ` +
    `${`${game.kills} kills`.padEnd(12)} survived ${formatDuration(game.survivalSeconds * 1000).padEnd(8)} ` +
    `played ${formatDuration(game.durationMs)}`
  );
}

export function saveResultLine(result: SaveResult | null, username: string | null): string {
  if (result === null) return 'Leaderboard offline · this game was not saved';
  if (username === null || result.rank === null) return 'Saved · set a name on the map screen to join the leaderboard';
  return `Saved · ${username} ranks #${result.rank} of ${result.players}`;
}
