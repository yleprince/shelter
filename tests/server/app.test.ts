import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../server/app.ts';
import { MAX_BODY_BYTES } from '../../server/config.ts';
import { GameStore } from '../../server/GameStore.ts';

const game = { username: 'Bob', mapId: 'serpent', score: 1200, wave: 14, kills: 230, survivalSeconds: 600, durationMs: 180_000 };
const NOW = new Date('2026-09-23T12:00:00.000Z');

let store: GameStore;
let server: Server;
let base: string;

beforeEach(async () => {
  store = new GameStore(':memory:');
  server = createApp(store, () => NOW);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  store.close();
});

const post = (body: string) => fetch(`${base}/api/games`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });

describe('API', () => {
  it('saves a game and serves it back in the leaderboard and history', async () => {
    const saved = await post(JSON.stringify(game));
    expect(saved.status).toBe(201);
    expect(await saved.json()).toEqual({ id: 1, rank: 1, players: 1 });

    const board = await (await fetch(`${base}/api/leaderboard?map=serpent`)).json();
    expect(board).toEqual({ entries: [{ rank: 1, username: 'Bob', score: 1200, mapId: 'serpent', wave: 14, playedAt: NOW.toISOString() }] });
    expect(await (await fetch(`${base}/api/leaderboard?map=gauntlet`)).json()).toEqual({ entries: [] });

    const history = await (await fetch(`${base}/api/games?username=bob`)).json();
    expect(history).toEqual({ games: [{ id: 1, ...game, playedAt: NOW.toISOString() }] });
  });

  it('answers the health check', async () => {
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: true });
  });

  it('refuses invalid games, bad JSON and oversized bodies', async () => {
    const invalid = await post(JSON.stringify({ ...game, score: -5 }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: 'score must be a non-negative integer' });
    expect((await post('{nope')).status).toBe(400);
    expect((await post(JSON.stringify({ ...game, padding: 'x'.repeat(MAX_BODY_BYTES) }))).status).toBe(413);
    expect((await fetch(`${base}/api/games?username=`)).status).toBe(400);
    expect((await fetch(`${base}/api/leaderboard?map=%27`)).status).toBe(400);
  });

  it('404s unknown routes and methods', async () => {
    expect((await fetch(`${base}/api/nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/leaderboard`, { method: 'DELETE' })).status).toBe(404);
  });
});
