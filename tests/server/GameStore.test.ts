import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GameSubmission } from '../../shared/api.ts';
import { GameStore } from '../../server/GameStore.ts';

const game = (username: string | null, score: number, mapId = 'crossroads'): GameSubmission => ({
  username,
  mapId,
  score,
  wave: Math.floor(score / 100),
  kills: score,
  survivalSeconds: 60,
  durationMs: 60_000,
});

let store: GameStore;
let minute = 0;
const at = () => new Date(Date.UTC(2026, 8, 23, 12, minute++));

beforeEach(() => {
  store = new GameStore(':memory:');
  minute = 0;
});
afterEach(() => store.close());

describe('GameStore', () => {
  it('stores every game with its server timestamp', () => {
    store.save(game('Bob', 100), at());
    store.save(game('Bob', 300), at());
    const games = store.recentGames('Bob', 10);
    expect(games.map((g) => g.score)).toEqual([300, 100]);
    expect(games[0]).toMatchObject({ username: 'Bob', mapId: 'crossroads', wave: 3, kills: 300, durationMs: 60_000 });
    expect(games[1].playedAt).toBe('2026-09-23T12:00:00.000Z');
  });

  it('ranks each named player once, by their best game', () => {
    store.save(game('Bob', 500, 'serpent'), at());
    store.save(game('Bob', 200), at());
    store.save(game('Ann', 400), at());
    store.save(game(null, 9000), at());
    expect(store.leaderboard(10, null)).toEqual([
      { rank: 1, username: 'Bob', score: 500, mapId: 'serpent', wave: 5, playedAt: '2026-09-23T12:00:00.000Z' },
      { rank: 2, username: 'Ann', score: 400, mapId: 'crossroads', wave: 4, playedAt: '2026-09-23T12:02:00.000Z' },
    ]);
  });

  it('filters the leaderboard by map and honours the limit', () => {
    store.save(game('Bob', 500, 'serpent'), at());
    store.save(game('Bob', 200), at());
    store.save(game('Ann', 400), at());
    store.save(game('Cid', 100), at());
    expect(store.leaderboard(10, 'crossroads').map((e) => [e.username, e.score])).toEqual([
      ['Ann', 400],
      ['Bob', 200],
      ['Cid', 100],
    ]);
    expect(store.leaderboard(1, null).map((e) => e.username)).toEqual(['Bob']);
  });

  it('treats names case-insensitively', () => {
    store.save(game('Bob', 100), at());
    store.save(game('bob', 200), at());
    expect(store.leaderboard(10, null)).toHaveLength(1);
    expect(store.recentGames('BOB', 10)).toHaveLength(2);
  });

  it('shares ranks on ties, earliest first', () => {
    store.save(game('Ann', 300), at());
    store.save(game('Bob', 300), at());
    store.save(game('Cid', 100), at());
    expect(store.leaderboard(10, null).map((e) => [e.rank, e.username])).toEqual([
      [1, 'Ann'],
      [1, 'Bob'],
      [3, 'Cid'],
    ]);
  });

  it('reports the player rank by their best game, and none when anonymous', () => {
    store.save(game('Ann', 400), at());
    expect(store.save(game('Bob', 500), at())).toMatchObject({ rank: 1, players: 2 });
    expect(store.save(game('Bob', 100), at())).toMatchObject({ rank: 1, players: 2 });
    expect(store.save(game('Cid', 450), at())).toMatchObject({ rank: 2, players: 3 });
    expect(store.save(game(null, 9000), at())).toMatchObject({ rank: null, players: 3 });
  });
});
