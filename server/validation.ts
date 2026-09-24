import type { GameSubmission } from '../shared/api.ts';
import { normalizeUsername } from '../shared/username.ts';
import { DEFAULT_LIST_LIMIT, MAP_ID_PATTERN, MAX_LIST_LIMIT } from './config.ts';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const COUNT_FIELDS = ['score', 'wave', 'kills', 'survivalSeconds', 'durationMs'] as const;

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

// The game runs in the browser, so a submission can't be proven genuine; this only keeps
// the table well-formed.
export function parseGameSubmission(body: unknown): Parsed<GameSubmission> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'expected a JSON object' };
  const input = body as Record<string, unknown>;

  let username: string | null = null;
  if (input.username !== null && input.username !== undefined) {
    if (typeof input.username !== 'string') return { ok: false, error: 'username must be a string or null' };
    if (input.username.trim() !== '') {
      username = normalizeUsername(input.username);
      if (username === null) return { ok: false, error: 'invalid username' };
    }
  }
  if (typeof input.mapId !== 'string' || !MAP_ID_PATTERN.test(input.mapId)) return { ok: false, error: 'invalid mapId' };
  for (const field of COUNT_FIELDS) {
    if (!isCount(input[field])) return { ok: false, error: `${field} must be a non-negative integer` };
  }
  return {
    ok: true,
    value: {
      username,
      mapId: input.mapId,
      score: input.score as number,
      wave: input.wave as number,
      kills: input.kills as number,
      survivalSeconds: input.survivalSeconds as number,
      durationMs: input.durationMs as number,
    },
  };
}

export function parseLimit(raw: string | null): number {
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isInteger(value) || value < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(value, MAX_LIST_LIMIT);
}

export function parseMapFilter(raw: string | null): Parsed<string | null> {
  if (raw === null || raw === '') return { ok: true, value: null };
  return MAP_ID_PATTERN.test(raw) ? { ok: true, value: raw } : { ok: false, error: 'invalid map' };
}
