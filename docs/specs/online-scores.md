# Spec: Online scores (username, leaderboard, game history)

Status: **implemented** (2026-09-23). The choices made along the way are listed in
[Decisions](#decisions).

Brings one more out-of-scope item into scope: **persistence beyond the best-score
cookie**, as a small scores database.

Goals:

1. **Username:** the player can enter a name and it is remembered.
2. **Leaderboard:** top scores, for all maps and per map.
3. **Game history:** every finished game is stored with its score, date and time,
   duration and username.
4. **A dead simple database** that runs from `docker-compose.yml`.

---

## 1. Architecture

```
browser ──/api/*──▶ nginx (shelter service) ──▶ api service :3000 ──▶ SQLite file
                                                                      (shelter-data volume)
```

- **Database: SQLite**, a single file (`/data/shelter.db`) on the `shelter-data` named
  volume. There's no database server to run, and a backup is a copy of one file.
- **API: `server/`**, plain Node 24 with no npm dependencies. `node:http` serves it,
  `node:sqlite` stores the data, and Node's type stripping runs the `.ts` files
  directly with no build step. Its image is `server/Dockerfile`.
- **Contract: `shared/`** holds the request/response types (`api.ts`) and username
  normalization (`username.ts`). The game and the server import the same files, so
  they accept exactly the same names.
- **nginx** proxies `/api/` to the `api` service. The upstream is resolved per request,
  so the web image still starts on its own, and the game then shows the leaderboard
  as offline. In development, Vite proxies `/api` to `npm run api` on port 3000.
- **Static hosting (GitHub Pages):** there's no API there. Every call fails fast, and
  the game plays the same, with "Leaderboard offline" where scores would show.

## 2. API

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/api/health` | | `{ ok: true }` |
| POST | `/api/games` | `GameSubmission` | `201 { id, rank, players }` |
| GET | `/api/leaderboard` | `map?`, `limit?` (default 10, max 50) | `{ entries: LeaderboardEntry[] }` |
| GET | `/api/games` | `username`, `limit?` | `{ games: GameRecord[] }` (newest first) |

- A submission is `username` (or null), `mapId`, `score`, `wave`, `kills`,
  `survivalSeconds` (simulated time, what the score counts) and `durationMs` (real
  time from start to game over, pauses included). The server stamps `playedAt`.
- Validation: counts must be non-negative safe integers. `mapId` must match
  `[a-z0-9-]{1,32}`. The username goes through `normalizeUsername`. The body is
  capped at 4 KB. Errors return `400`/`413 { error }`.
- **Leaderboard:** one row per named player, their best game (on the chosen map, or on
  any map). Ranking is competition style (1, 2, 2, 4), and on a tie the earlier game
  comes first. Names compare case-insensitively.
- `rank` in the save response is the player's all-maps rank by their best game (null
  for anonymous games). `players` is the number of named players.

### Table

`games(id, username COLLATE NOCASE, map_id, score, wave, kills, survival_seconds,
duration_ms, played_at)`, indexed on `(username, score)` and `(map_id, score)`. The
table is created on startup if missing.

## 3. Game

- **Name field** on the map screen (top left). It's an HTML `<input>`, with Phaser's DOM
  container enabled. `n` focuses it, Enter saves, Escape undoes, and a click elsewhere
  saves. Names are 1–16 letters, digits, spaces, `.`, `_` or `-`, with whitespace
  collapsed. An invalid name isn't saved and the field says why. An empty name means
  playing anonymously. The name is kept in `localStorage` (`shelter_username`). If
  storage is blocked, it's kept in memory for the page load.
- **Game over** saves the game once and shows the result under the score: `Saved · Bob
  ranks #3 of 12`, a hint to set a name when anonymous, or `Leaderboard offline · this
  game was not saved`. The best-score cookie is unchanged and works offline.
- **Top scores** (`LeaderboardScene`): `t` or a button on the map screen and on game
  over. It opens as an overlay and pauses the scene underneath, so game over is never
  restarted and never saves a game twice. It shows the top 10 with tabs for All maps
  and each map (`h`/`l`, arrows or click), the viewer's own row marked `▶`, and the
  viewer's last 6 games (date and time, map, score, wave, kills, time survived, real
  time played). `Esc`/`q`/`t` closes it. Opened from game over, it waits for the save
  to finish, so the new game is included.
- All calls time out after `API_TIMEOUT_MS` and resolve to null on any failure. The
  game never throws or blocks on the network.

## Decisions

| # | Question | Decision | Alternatives |
|---|---|---|---|
| 1 | Database | **SQLite file on a volume**, used from Node's built-in `node:sqlite` | Postgres/MySQL service (heavier). PocketBase or another hosted backend |
| 2 | Server stack | **Plain Node 24, no dependencies**, TypeScript by type stripping | Express/Fastify. A compiled build step |
| 3 | Identity | **Free-text name, no account or password.** Anyone can post under any name | Accounts. A secret token per browser to claim a name |
| 4 | Anti-cheat | **None beyond shape validation.** The game runs client-side, so a score can't be verified | Signed submissions. Server-side replay |
| 5 | Anonymous games | **Stored, but kept off the leaderboard** | Shown as "anonymous". Refused |
| 6 | Leaderboard shape | **Best game per player**, all maps plus one board per map | Every game (one player could fill the board) |
| 7 | Name case | **Case-insensitive** ("Bob" = "bob"), shown as typed in each game | Case-sensitive |
| 8 | Duration | **Both**: simulated survival time (score) and real time played | Only one of them |
| 9 | Where the name lives | **`localStorage`** | Another cookie. Server-side profile |
| 10 | Leaderboard UI | **Overlay scene** over map select / game over | A separate screen that restarts game over (it would save twice) |
