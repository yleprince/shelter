import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { normalizeUsername } from '../shared/username.ts';
import { MAX_BODY_BYTES } from './config.ts';
import type { GameStore } from './GameStore.ts';
import { parseGameSubmission, parseLimit, parseMapFilter } from './validation.ts';

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createApp(store: GameStore, now: () => Date = () => new Date()): Server {
  return createServer((req, res) => {
    route(store, now, req, res).catch((err: unknown) => {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      send(res, status, { error: err instanceof HttpError ? err.message : 'internal error' });
    });
  });
}

async function route(store: GameStore, now: () => Date, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const endpoint = `${req.method} ${url.pathname.replace(/\/+$/, '')}`;

  switch (endpoint) {
    case 'GET /api/health':
      return send(res, 200, { ok: true });

    case 'GET /api/leaderboard': {
      const map = parseMapFilter(url.searchParams.get('map'));
      if (!map.ok) throw new HttpError(400, map.error);
      return send(res, 200, { entries: store.leaderboard(parseLimit(url.searchParams.get('limit')), map.value) });
    }

    case 'GET /api/games': {
      const username = normalizeUsername(url.searchParams.get('username') ?? '');
      if (username === null) throw new HttpError(400, 'invalid username');
      return send(res, 200, { games: store.recentGames(username, parseLimit(url.searchParams.get('limit'))) });
    }

    case 'POST /api/games': {
      const game = parseGameSubmission(await readJson(req));
      if (!game.ok) throw new HttpError(400, game.error);
      return send(res, 201, store.save(game.value, now()));
    }

    default:
      throw new HttpError(404, 'not found');
  }
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'body too large');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
