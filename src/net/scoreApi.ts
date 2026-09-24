import { API_TIMEOUT_MS, LEADERBOARD_SIZE, RECENT_GAMES_SIZE } from '../config';
import type { MapId } from '../data/maps';
import type { GameRecord, GameSubmission, LeaderboardEntry, SaveResult } from '../../shared/api';

// Relative to the page, like the Vite base: the API sits at api/ wherever the game is
// served (nginx and the dev server proxy it). On a static host with no API every call
// fails, and callers treat null as "offline".
function apiUrl(path: string, params: Record<string, string | number | null> = {}): URL {
  const url = new URL(`api/${path}`, new URL(import.meta.env.BASE_URL, window.location.href));
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) url.searchParams.set(key, String(value));
  }
  return url;
}

async function request<T>(url: URL, init: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export function submitGame(game: GameSubmission): Promise<SaveResult | null> {
  return request<SaveResult>(apiUrl('games'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  });
}

export async function fetchLeaderboard(mapId: MapId | null): Promise<LeaderboardEntry[] | null> {
  const body = await request<{ entries: LeaderboardEntry[] }>(apiUrl('leaderboard', { map: mapId, limit: LEADERBOARD_SIZE }));
  return body?.entries ?? null;
}

export async function fetchRecentGames(username: string): Promise<GameRecord[] | null> {
  const body = await request<{ games: GameRecord[] }>(apiUrl('games', { username, limit: RECENT_GAMES_SIZE }));
  return body?.games ?? null;
}
