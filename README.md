# Shelter

A small 2D tower defense game. Waves of raiders march down a single path toward your
shelter, getting bigger and tougher over time. Place turrets to hold them off — the
longer you survive, the more points you bank.

## Gameplay

- Pick one of three maps: **Crossroads** (easy, x1 score), **Serpent** (medium,
  x1.25) or **Gauntlet** (hard, x1.5). Harder maps have shorter paths.
- Enemies spawn in waves and walk the fastest route to your shelter. New, tougher
  enemy tiers join as the waves go on, plus three specials: **runners** ignore
  gravel, **armored** enemies shrug off weak hits, and **splitters** burst into two
  smaller enemies when killed. Every 10th wave brings a boss.
- Place a turret (50 scrap) on any free ground tile. The cursor shows whether you can
  build there and the turret's range.
- Open a turret to upgrade it (up to Lv8; higher levels unlock at later waves) or sell
  it for 60% of the scrap you put in.
- **Reshape the path**: turn any tile into path, gravel (enemies walk at half speed),
  ice (enemies rush through it, but kills on ice score five times the points),
  water and fire (unlocked at waves 150 and 250: water slows even runners, fire burns
  whatever walks on it) or buildable ground, for a price that grows each wave. Enemies reroute on the fly,
  so gravel on one of two routes diverts them to the other. You can't cut the route
  to the shelter completely.
- Turrets auto-fire at the nearest enemy in range.
- Each wave is preceded by a short countdown; **Next wave** skips it.
- Speed the game up (x1 / x2 / x10 / x50) or **pause** with Space. You can still
  build, upgrade, sell, edit tiles and repair while paused.
- Killing enemies earns scrap; enemies that reach the shelter damage it. **Repair**
  restores 10 HP for a price that grows each wave.
- The game ends when the shelter's HP hits zero.
- Your final score combines how long you survived, how many enemies you killed and
  how much scrap you had saved up, times the map multiplier.
- Enter a **name** on the map screen (`n`) to join the online **leaderboard** (`t`):
  every game is saved with its score, date and duration. The top scores are shown
  for all maps and for each map, alongside your last games.

## Controls

Everything works with the mouse or the keyboard alone. Press **?** in game for the
full list. The highlights, vim style:

| Keys | Action |
|---|---|
| `h` `j` `k` `l` / arrows, `H` `J` `K` `L` | Move the cursor 1 / 5 tiles |
| `0` `$` `gg` `G` `w` `b` `gs` | First / last column, top / bottom row, next / previous tower, shelter |
| `Enter` / `i` | Place a turret (Enter opens a turret's panel) |
| `u` / `dd` | Upgrade / sell the turret under the cursor |
| `r` then `p` / `g` / `w` / `f` / `i` / `b` | Turn the tile into path / gravel / water / fire / ice / buildable ground |
| `Space`, `1`–`4`, `R`, `n` | Pause, speed, repair, next wave |

With the mouse: left-click to build or open a turret, right-click a tile to edit it.
All bindings live in `src/data/keybindings.ts`.

## Tech Stack

- [Phaser 3](https://phaser.io) for the game engine
- TypeScript
- [Vite](https://vitejs.dev) for the dev server and build
- [Vitest](https://vitest.dev) for unit tests
- Placeholder art is generated in code for now; free CC0 sprites from
  [Kenney.nl](https://kenney.nl) are planned

## Getting Started

Needs Node 24 (`nvm use`).

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser. For the leaderboard, also run the
scores API in a second terminal (it stores games in `data/shelter.db`):

```bash
npm run api
```

## Scripts

| Command            | Description                              |
|---------------------|-------------------------------------------|
| `npm run dev`        | Start the dev server with hot reload      |
| `npm run build`       | Type-check and build for production       |
| `npm run preview`      | Preview the production build locally       |
| `npm run typecheck`     | Run TypeScript checks without building     |
| `npm run api`           | Run the scores API on port 3000            |
| `npm test`              | Run the unit tests once                    |

## Deployment

The production build in `dist/` is deployed to GitHub Pages.

```bash
npm run build
# publish dist/ to the gh-pages branch (or your CI of choice)
```

On GitHub Pages there's no API: the game works the same, and the leaderboard shows
as offline.

### Docker

`docker compose` runs two services:

- `shelter`: the image runs the tests, builds the game and serves `dist/` with nginx on
  port 80. It proxies `/api/` to the API.
- `api`: the scores API (`server/`, plain Node 24). The database is a single SQLite
  file on the `shelter-data` volume.

```bash
docker compose up --build -d   # then open http://localhost:8080
```

Back up the scores by copying the database file out of the volume:

```bash
docker compose cp api:/data/shelter.db ./shelter-backup.db
```

The web image also runs alone (`docker build -t shelter . && docker run --rm -p
8080:80 shelter`), with the leaderboard offline.

## Balancing

Gameplay constants (starting scrap, wave scaling, boss, repair, tile edits, special
enemy traits, speeds, score weights) live in `src/config.ts`. Turret levels, enemy
tiers, special enemies, maps and key bindings are tables in `src/data/`.

## Credits

- Built with [Phaser 3](https://phaser.io)

## License

TBD.
