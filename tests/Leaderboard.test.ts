import { describe, expect, it } from 'vitest';
import type { GameRecord, LeaderboardEntry } from '../shared/api';
import {
  formatDuration,
  formatPlayedAt,
  LEADERBOARD_HEADER,
  leaderboardLine,
  mapName,
  recentGameLine,
  sameUsername,
  saveResultLine,
} from '../src/systems/Leaderboard';

const localIso = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi).toISOString();

const entry: LeaderboardEntry = { rank: 3, username: 'Bob', score: 123456, mapId: 'serpent', wave: 42, playedAt: localIso(2026, 9, 23, 14, 5) };

describe('Leaderboard formatting', () => {
  it('names maps, falling back to the raw id', () => {
    expect(mapName('gauntlet')).toBe('Gauntlet');
    expect(mapName('atlantis')).toBe('atlantis');
  });

  it('compares names case-insensitively and never matches no name', () => {
    expect(sameUsername('Bob', 'bOB')).toBe(true);
    expect(sameUsername('Bob', 'Ann')).toBe(false);
    expect(sameUsername(null, null)).toBe(false);
  });

  it('formats dates in local time, to the minute', () => {
    expect(formatPlayedAt(localIso(2026, 1, 2, 3, 4))).toBe('2026-01-02 03:04');
    expect(formatPlayedAt('garbage')).toBe('garbage');
  });

  it('formats durations at a readable precision', () => {
    expect(formatDuration(45_900)).toBe('45s');
    expect(formatDuration(12 * 60_000 + 5_000)).toBe('12m 05s');
    expect(formatDuration(2 * 3_600_000 + 3 * 60_000 + 59_000)).toBe('2h 03m');
  });

  it('lines leaderboard rows up under the header and marks the viewer', () => {
    const line = leaderboardLine(entry, 'bob');
    expect(line.startsWith('▶ 3')).toBe(true);
    expect(line).toContain('123 456');
    expect(line.endsWith('2026-09-23')).toBe(true);
    expect(line.indexOf('Serpent')).toBe(LEADERBOARD_HEADER.indexOf('Map'));
    expect(leaderboardLine(entry, null).startsWith('  3')).toBe(true);
  });

  it('describes a past game', () => {
    const game: GameRecord = { ...entry, id: 1, kills: 900, survivalSeconds: 754, durationMs: 90_000 };
    expect(recentGameLine(game)).toMatch(/^2026-09-23 14:05 +Serpent +123 456 +wave 42 +900 kills +survived 12m 34s +played 1m 30s$/);
  });

  it('explains what happened to the saved game', () => {
    expect(saveResultLine(null, 'Bob')).toBe('Leaderboard offline · this game was not saved');
    expect(saveResultLine({ id: 1, rank: null, players: 4 }, null)).toContain('set a name');
    expect(saveResultLine({ id: 1, rank: 2, players: 4 }, 'Bob')).toBe('Saved · Bob ranks #2 of 4');
  });
});
