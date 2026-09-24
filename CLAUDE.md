# CLAUDE.md

Guidance for Claude Code (and any future contributor) working in this repository.

## Project Overview

**Shelter** is a 2D top-down tower defense game. The player picks one of three maps; a
single shelter sits at the end of that map's path; waves of raiders/mutants march down
that path toward it, growing more numerous and dangerous over time. The player places
turrets along the path, and can reshape the path itself tile by tile, to kill enemies
before they reach the shelter. The longer the shelter survives, the higher the
score — combining survival time, enemies killed, and resources (currency) saved.

The MVP plus the progression features in `docs/specs/progression.md` (map selection,
game speed, tower levels, enemy tiers and boss waves, selling, shelter repair) and
`docs/specs/progression-2.md` (pause, keyboard/vim play with a help menu, tile editing,
tiers T6–T8, special enemies, tower Lv6–Lv8) and `docs/specs/progression-3.md` (speeds,
best score, shelter upgrades, water/fire/ice tiles, max upgrade, late-game specials,
boss types and wave themes) and `docs/specs/online-scores.md` (username, leaderboard,
game history in a SQLite-backed API) are implemented. This file describes the architecture and conventions so that further work
stays consistent.

## Tech Stack

- **Phaser 3** — 2D game framework (rendering, scene management, physics, input)
- **TypeScript** — all game code
- **Vite** — dev server + build tooling
- **Vitest** — unit tests for the plain-TS systems
- Assets: currently **procedurally generated placeholder textures** drawn in
  `BootScene` under the keys in `src/data/textures.ts`. The plan is to swap in free CC0
  sprite packs from [Kenney.nl](https://kenney.nl) (e.g. the Tower Defense Kit for
  towers/path tiles, a zombie/survivor pack for enemies and the shelter), recolored for
  a post-apocalyptic tone — load them in `BootScene` under the same `TEXTURES` keys and
  nothing else needs to change. No paid or unlicensed assets.
- **Node 24** (`.nvmrc`) for tooling and the scores API: `server/` runs its `.ts`
  files directly with Node's type stripping and stores games in SQLite via the
  built-in `node:sqlite`. No npm dependencies on the server.
- Deployment target: GitHub Pages, built from the Vite `dist/` output (no API there:
  the game shows the leaderboard as offline). A `Dockerfile` also packages the same
  build behind nginx, and `docker-compose.yml` adds the API with its database.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check and build production bundle to `dist/`
- `npm run preview` — preview the production build locally
- `npm run typecheck` — type-check the game (`tsc --noEmit`) and the server
  (`-p server`)
- `npm run api` — run the scores API on port 3000 (`data/shelter.db`); `npm run dev`
  proxies `/api` to it
- `npm test` — run the Vitest suite in `tests/` once
- `docker compose up --build` — build and run both services: `shelter` (tests +
  production build in a Node stage, `dist/` served by nginx using `docker/nginx.conf`,
  which proxies `/api/`) on port 8080, and `api` (`server/Dockerfile`) with the SQLite
  file on the `shelter-data` volume

## Project Structure

```
shelter/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  Dockerfile           # node build stage → nginx serving dist/
  docker-compose.yml   # web on port 8080 + api with the shelter-data volume
  docker/
    nginx.conf         # static files, /api/ proxied to the api service
  shared/              # imported by both the game and the server (no imports of its own)
    api.ts             # request/response types of the scores API
    username.ts        # username rules: normalizeUsername, USERNAME_MAX_LENGTH
  server/              # scores API: Node 24, node:http + node:sqlite, no dependencies
    Dockerfile
    tsconfig.json      # NodeNext, erasable syntax only, .ts import extensions
    main.ts            # bootstrap: env PORT / DB_PATH, graceful shutdown
    app.ts             # routes: /api/health, /api/games, /api/leaderboard
    GameStore.ts       # SQLite schema and queries (every game; best per player)
    validation.ts      # request parsing
    config.ts          # server limits
  public/
    assets/            # (empty for now) sprite sheets, audio, favicon — served as-is
  src/
    main.ts            # Phaser.Game bootstrap + config
    config.ts           # all tunable gameplay constants (see Wave & Difficulty Scaling)
    scenes/
      BootScene.ts       # generates placeholder textures (later: preload sprites)
      MapSelectScene.ts   # pick one of the 3 maps (mouse or keyboard)
      GameScene.ts        # core gameplay: fixed-step loop, key dispatch, cursor, placement,
                          #   tile edits, enemies, shelter, pause
      UIScene.ts          # HUD, status line, tower panel, tile panel, help overlay
      GameOverScene.ts     # final score breakdown, saves the game, retry / change map
      LeaderboardScene.ts  # top scores + your last games, overlay over the paused scene
    entities/
      Enemy.ts
      Tower.ts
      Projectile.ts
      Shelter.ts
    ui/
      HelpOverlay.ts       # help overlay generated from data/keybindings.ts
      labels.ts            # player-facing text for blockers and tile types
      bestScoreCookie.ts   # the only code touching document.cookie (best score)
      usernameStorage.ts   # the only code touching localStorage (username)
    net/
      scoreApi.ts          # the only code calling the API; null on any failure
    systems/
      WaveManager.ts       # wave phases (breather → spawning → clearing), spawn queue
      WaveComposer.ts      # pure functions: tier/special mix, interleaving, boss waves,
                           #   stat scaling, splitter children
      EnemyTraits.ts       # armor damage, terrain speed multiplier and damage, war-aura damage
      Auras.ts             # who's healed, jammed and war-buffed (pure, per aura tick)
      BurrowCycle.ts       # burrower surface/underground timer
      SpawnerTimer.ts      # carrier / Hive Queen minion drops, capped
      GameClock.ts         # speed multiplier, pause, fixed-step accumulator
      KeySequence.ts       # vim-style key sequences (gg, dd, r…) with timeout → actions
      TileCursor.ts        # keyboard cursor: position, clamping, motions, tower jumps
      TowerProgress.ts     # tower level, upgrade gating, invested scrap, sell value
      ShelterHealth.ts     # shelter level, HP, damage, repair + repair cost, upgrades
      UpgradePlan.ts       # next-level blocker and max-upgrade plan over any level table
      Economy.ts           # currency balance, earn/spend
      ScoreManager.ts       # tracks survival time, kills, computes final score breakdown
      BestScore.ts         # best-score record: parse, serialize, format, "new best"
      Leaderboard.ts       # leaderboard / history row formatting, save result line
      MapGrid.ts           # tile-type grid, occupied tiles, tile↔world
      PathField.ts         # Dijkstra from the shelter: fastest next tile from anywhere
      TileFollower.ts      # walks tile centre to tile centre, asking for the next tile
      TileEditor.ts        # tile edit cost and refusal rules
    data/
      maps.ts             # the 3 map definitions (initial path, difficulty, score multiplier)
      towerLevels.ts       # turret Lv1–Lv8 stat/cost/unlock table
      shelterLevels.ts      # shelter Lv1–Lv5 max HP/cost/unlock table
      enemyTiers.ts        # enemy T1–T8 base stats and wave ranges
      specialEnemies.ts     # the nine specials' stats and traits (+ shared trait types)
      bosses.ts            # the six boss types: multipliers, reward, debut wave, trait
      waveThemes.ts        # normal / swarm / tank / rush / elite wave shapes
      keybindings.ts        # every key binding, per scene (source of truth for help too)
      tileTypes.ts          # tile types: walkable, speed, edit cost/key, unlock wave
      textures.ts          # texture keys and render depths
  tests/                 # Vitest specs for the plain-TS systems and data tables
    server/              # API specs: validation, GameStore (in-memory SQLite), HTTP
  docs/specs/            # feature specs
  CLAUDE.md
  README.md
```

Keep gameplay logic (entities/systems) decoupled from Phaser scene wiring where
practical — e.g. `ScoreManager` and `Economy` should be plain TS classes that
`GameScene`/`UIScene` read from and call into, not scenes themselves. This keeps them
unit-testable without a running Phaser instance. Everything under `systems/` follows
this rule and has a matching spec in `tests/`; new systems should too. Entities compose
their logic from a system (`Tower` → `TowerProgress`, `Shelter` → `ShelterHealth`) and
only add the Phaser sprites on top.

## Core Game Design

### Entities
- **Shelter**: fixed position at the end of the path, with levels Lv1–Lv5
  (`data/shelterLevels.ts`, 100 → 450 max HP, gated by wave and cost, no refunds). An
  upgrade adds the max HP gained to current HP rather than healing fully, and swaps
  the texture. Any enemy that reaches it deals its damage value to the shelter's HP and
  is removed. Game over when shelter HP reaches `0`. The player can repair it from the
  HUD at any time: `round(maxHp × SHELTER_REPAIR_RATIO)` HP (clamped to max) for
  `SHELTER_REPAIR_BASE_COST + wave * SHELTER_REPAIR_COST_PER_WAVE` scrap.
- **Enemy**: eight stat tiers (T1–T8, `data/enemyTiers.ts`), nine specials
  (`data/specialEnemies.ts`) and six boss types (`data/bosses.ts`), each with its own
  look. Walks the current fastest route at its terrain speed, has HP, contact damage and
  a kill reward (all computed per wave by `WaveComposer`), dies when HP reaches `0`.
  Specials and bosses carry traits from an `EnemyTraitSet`, copied onto optional
  `EnemySpec` fields and applied generically by `Enemy` (never `if (kind === …)`):
  - `slowImmune`: tile types that don't slow it (runner: gravel; swimmer, leviathan:
    gravel and water).
  - `armor`: each hit deals `max(damage − armor, ARMOR_MIN_DAMAGE)` (armored 8,
    juggernaut 150). Fire ignores armor.
  - `splitsInto` (splitter): on death spawns `SPLITTER_CHILD_COUNT` smaller T1-based
    children where it died, worth `SPLITTER_CHILD_REWARD_RATIO` of T1's reward.
  - `spawner` (carrier, Hive Queen): drops minions every `everyMs`, at most `maxTimes`.
    Children of both kinds start where the parent stands and each counts as a kill.
    They're outside the spawn queue; `WaveManager` waits for them because it counts
    every live enemy.
  - `fireproof` (salamander, phoenix): no fire damage.
  - `healAura` (healer), `jamAura` (jammer: towers in range fire at ×2 cooldown, grey
    guns), `warAura` (warlord: others in range move ×1.3 and take ×0.7 damage). Auras
    are computed by `Auras` every `AURA_TICK_MS` of game time, not per step; same-kind
    auras don't stack; heals skip bosses and healers. Aura ranges are drawn as circles.
  - `burrow` (burrower): 3 s surface / 2 s underground. Underground it's untargetable,
    drawn as a mound, and projectiles arriving then miss; fire still burns it.
  - `revive` (phoenix): its first death leaves a dormant ember (alive for the wave,
    untargetable, not moving) that rises after `delayMs` at `hpRatio` HP. Only the final
    death pays the kill.
  - The status line introduces each special, boss and theme the first time it appears
    in a game (`New: Healer · heals nearby enemies`).
- **Tower**: a single turret type with levels Lv1–Lv8 (`data/towerLevels.ts`), placed
  at Lv1 on valid non-path tiles. Auto-targets the nearest targetable enemy within range and fires
  on a cooldown. Clicking it opens a panel to upgrade in place (gated by wave and cost)
  or sell for `TOWER_SELL_REFUND_RATIO` × total invested, freeing the tile.
- **Upgrades** (towers and shelter share `UpgradePlan`): `u` takes one level of what's
  under the cursor, `U` (or the tower panel's Max button) takes levels in order while
  each is unlocked and the running total is affordable, never skipping one, charged
  once. `S` upgrades the shelter one level from anywhere, as does the HUD button.
- **Projectile**: spawned by a tower on fire, travels toward its target, deals damage
  on hit.

### Maps / Path
- The map is a `TILE_SIZE` grid covering the canvas (`GAME_WIDTH` × `GAME_HEIGHT`).
  The top `HUD_ROWS` rows sit under the HUD bar and the bottom `STATUS_ROWS` row is the
  status line; neither is playable (no path, towers, edits or cursor).
- Three maps in `data/maps.ts` (Crossroads / Serpent / Gauntlet), chosen in
  `MapSelectScene`. Shorter paths are harder and carry a higher score multiplier. The
  multiplier stays even though the player can lengthen a path: edits cost scrap, and
  spent scrap no longer counts as saved.
- A map's waypoints only define its **initial layout**: path tiles along them, ground
  everywhere else. Consecutive waypoints must share a row or column (`MapGrid` throws
  otherwise); the first waypoint is off-map (enemies walk in from it in a straight
  lead-in to the **entry tile**, the first in-bounds one), and the last one is the
  shelter tile. `tests/maps.test.ts` checks every map against these rules.
- Tile types come from the `TILE_TYPES` table in `data/tileTypes.ts` (walkable, speed
  multiplier, edit cost, unlock wave, edit key, optional kill score multiplier and damage per second); its key order is the display order of
  the tile panel, the `r…` hint and the help. **path** (×1), **gravel** (×0.5),
  **water** (×0.25, unlocks at wave 150), **fire** (×1, unlocks at wave 250) and **ice**
  (×1.5, kills on it score ×5) are walkable; **ground** is the only buildable one. Code reads the table instead of naming types (`if (type === …)`), so a new type
  is a new row. Towers go on any playable ground tile that isn't occupied (by a tower or
  the shelter). The cursor shows the tile in green/red plus the tower's range circle.
- **Fire** burns every enemy on it each sim step for `(base + wave × perWave) × stepMs /
  1000` (`EnemyTraits.terrainDamage`, 200 + 20 × wave per second). `Enemy.burn` skips
  armor, and `GameScene` handles a burn death like a projectile kill (scrap, kill,
  splitter children). Burning enemies get an orange tint. Routing ignores fire: it
  only looks at speed.
- **Routing** (`PathField`): Dijkstra from the shelter over walkable tiles
  (4-neighbours, fixed neighbour order for ties). An edge costs the average of both
  tiles' step costs (`1 / speedMultiplier`: 1 on path, 2 on gravel, 4 on water, ≈0.67 on
  ice), so enemies take the **fastest** route and are drawn onto ice. Recomputed after every edit. Enemies (`TileFollower`) ask
  for the next tile each time they reach a tile centre, so edits reroute everyone from
  where they stand. All enemies share one route; branches and dead ends are ignored.
- **Tile edits** (`TileEditor`): `r` + the type's `editKey` (`p`/`g`/`b`/`w`/`f`/`i`) on the
  cursor, or the right-click tile panel. Cost `editBaseCost + wave *
  TILE_EDIT_COST_PER_WAVE`, no refunds, allowed any time (paused and mid-wave
  included). Refused when: not playable; `locked` (wave < the type's `unlockWave`; the
  panel still lists the option, with the unlock wave); the shelter tile; the entry → ground; a tower on it; already that type; → ground under
  (or ahead of) an enemy; → ground would cut the entry, or any enemy, off from the
  shelter; unaffordable. The status line or tile panel shows the reason. While editing,
  the board previews the route (the panel previews the hovered option's result).

### Economy
- Currency is called **scrap** in the UI. Player starts with `STARTING_CURRENCY`.
- Placing, upgrading, repairing and editing tiles cost currency; insufficient currency
  blocks them.
  Selling refunds part of what the tower cost.
- Killing an enemy grants `tierReward + wave * ENEMY_KILL_REWARD_PER_WAVE`; a boss
  grants a flat `BOSS_REWARD`.
- Currency remaining at any time counts as "resources saved" and feeds into the score.

### Wave & Difficulty Scaling
Each wave increases threat via **more enemies and tougher enemies** (not just faster
spawn pacing), composed by `WaveComposer`:
- Enemy count per wave: `WAVE_BASE_ENEMY_COUNT + wave * WAVE_COUNT_INCREMENT`
- Active specials are those with `appearsFrom ≤ wave` (they never retire). Each takes
  `ceil(count × min(SPECIAL_SHARE, SPECIAL_MAX_TOTAL_SHARE / activeSpecials))` out of the
  wave's count, so wave size is unchanged and tiers keep about half of it.
- Active tiers are those with `appearsFrom ≤ wave ≤ retiresAfter`. The remaining count
  is split evenly across them, remainder to the weakest; tiers spawn weakest first, and
  specials (round-robin between kinds) are interleaved evenly through them.
- Enemy HP per wave: `tierHp * (1 + wave * WAVE_HP_SCALE_PER_WAVE)`
- Enemy speed per wave: `tierSpeed * (1 + wave * WAVE_SPEED_SCALE_PER_WAVE)`, capped at
  `WAVE_SPEED_MAX_MULTIPLIER` so it never becomes unfair/unreadable
- Every `BOSS_WAVE_INTERVAL`th wave has `BOSS_WAVE_ESCORT_RATIO` of the usual count
  (rounded up, specials included) plus its boss(es) spawned last, built from the
  strongest active tier's HP and T1's speed times the boss row's multipliers, rewarding
  `reward + wave × BOSS_REWARD_PER_WAVE`. A boss debuts on the boss wave equal to its
  `appearsFrom`; other boss waves take `activeBosses[(wave / BOSS_WAVE_INTERVAL) %
  active]`. From `BOSS_PAIR_FROM_WAVE` the next active boss in table order joins it.
  During the breather a banner under the HUD names the bosses.
- Non-boss waves from `WAVE_THEMES_FROM_WAVE` take `WAVE_THEMES[wave % length]`
  (`data/waveThemes.ts`: count, HP, speed, reward and spawn-interval multipliers, or
  specials only). Theme speed is applied after the speed cap (rush breaks it on
  purpose). Children are themed too. The banner shows the theme during the breather.
- Enemies within a wave spawn every `WAVE_SPAWN_INTERVAL_MS` (× the theme's multiplier).
- A `WAVE_BREATHER_MS` countdown precedes every wave (including the first) and starts
  once the previous wave is fully cleared. The HUD's "Next wave" button skips it.

All the constants above (increments, scale factors, starting currency, boss, theme, aura, repair,
refund, speed, special, tile-edit and key-timeout settings) belong in
`src/config.ts` as named constants, and the per-level (tower and shelter) / per-tier / per-special / per-boss / per-theme /
per-map / per-tile-type / key-binding tables in `src/data/`. Never hardcode them
inline in entities/systems, so balancing stays a data-only change.

### Game speed and pause
- x1 / x5 / x100 / x500 (`GAME_SPEEDS`), picked from the HUD or keys 1–4; each game
  starts at x1, unpaused. The key descriptions are built from `GAME_SPEEDS`.
- Space (or the HUD button) toggles pause. `GameClock.advance()` returns 0 steps while
  paused and drops the delta, so resuming never bursts. Everything simulated stops;
  the player can still build, upgrade, sell, edit, repair and start the next wave
  ("planning pause"). Speed changes keep the pause. The help menu pauses while open
  and restores the previous pause state on close.
- `GameClock` turns each frame's real delta (capped at `MAX_FRAME_DELTA_MS`) × speed
  into fixed `SIM_STEP_MS` steps. All gameplay (waves, enemies, towers, projectiles,
  score) updates per step; sprites render once per frame. Never feed the raw frame
  delta into gameplay: at x500 projectiles would tunnel through enemies.
- `advance()` never returns more than `MAX_SIM_STEPS_PER_FRAME` steps; time over the
  cap is dropped, not banked, so on a slow machine x500 just runs below x500 instead of
  locking up the tab.
- Any shelter damage above x1 drops the speed to x1 (`GameClock.dropToBaseSpeed()`,
  which also clears the accumulator) and `GameScene` discards the rest of that frame's
  steps, so fast-forward never hides a leak. The pause state is kept; the status line
  says so.
- Survival time counts simulated time, so the score doesn't depend on speed.

### Scoring
Final score combines all three axes discussed for this game:
```
score = floor(( survivalSeconds * SURVIVAL_POINTS_PER_SEC
              + normalKills * POINTS_PER_KILL
              + iceKills * POINTS_PER_KILL * TILE_TYPES.ice.killScoreMultiplier
              + currencyRemaining * POINTS_PER_SAVED_CURRENCY ) * mapScoreMultiplier)
```
An ice kill is an enemy that dies while its position is on an ice tile (`GameScene`
checks the tile and shows a `×5` popup). Only the score changes, never the scrap
reward. The game over kills line counts all kills; ice kills get their own line.
`ScoreManager` tracks survival time and kills live during play; the final value is
computed once and shown on `GameOverScene`. Point weights are constants in
`config.ts`.

One **best score** per browser (all maps) is kept in the `shelter_best` cookie as
URI-encoded `score|mapId|wave`, path-scoped to the resolved Vite base URL, for a year.
Game over saves a strictly higher score and shows `NEW BEST!` or the stored best; map
select shows the best when there is one. `BestScore` is plain TS; only
`ui/bestScoreCookie.ts` touches `document.cookie`. Missing, malformed or blocked
cookies mean "no best yet" and never throw.

### Online scores
- The API (`server/`) stores **every finished game** in one SQLite table: username (or
  null), map, score, wave, kills, simulated survival seconds, real duration in ms, and
  `played_at` stamped by the server. The leaderboard is derived from it: each named
  player's best game, for all maps or one map, with competition ranking. Names are
  case-insensitive. Anonymous games are stored but kept off the leaderboard.
- The game reaches the API at `api/` relative to the page (nginx and the Vite dev server
  proxy it). `net/scoreApi.ts` resolves every call to null on failure or after
  `API_TIMEOUT_MS`. The game must keep working with no API (GitHub Pages) and shows
  "Leaderboard offline" instead.
- The name field on the map screen is an HTML `<input>` (Phaser DOM container,
  `dom.createContainer`). Key handlers ignore keys typed into it except Enter/Escape.
  Global key capture is off while it has focus, and it's hidden while the scene is
  paused under the leaderboard, because the DOM layer draws above the canvas.
- `GameOverScene` saves the game once in `create`. The leaderboard opens as an overlay
  (`scene.pause()` + `scene.launch`) and resumes the scene underneath on close. Never
  restart game over to return to it, or the game would be saved twice.
- Username rules live in `shared/username.ts`, used by both sides. There's no auth or
  anti-cheat: scores are client-reported (see the spec's decisions).
- `shared/` and `server/` files use `.ts` import extensions and erasable syntax only
  (Node runs them unbuilt). `server/` never imports from `src/`. Server tests run on
  an in-memory database.

### Controls
- The whole game is playable by keyboard or mouse. **`src/data/keybindings.ts` is the
  source of truth** for keys: scenes resolve key presses through it (`KeySequence`,
  with `KEY_SEQUENCE_TIMEOUT_MS` for multi-key sequences like `gg`, `dd`, `r…`) and
  the `?` help overlays are generated from it, so never hardcode a key elsewhere.
  `tests/keybindings.test.ts` checks no sequence is bound twice or shadows another.
- In game, a tile cursor (moved by vim motions or the mouse; they share one position)
  is the target of every tile action. Pending keys, messages and the cursor tile show
  in the status line. HUD and panel buttons show their key.
- Mouse: left-click places a turret or opens a turret's panel (upgrade / sell); a click
  elsewhere while a panel is open only closes it. Right-click opens the tile panel.
- Game over ignores keys for `GAME_OVER_INPUT_DELAY_MS`, since Space also pauses.
- No manual aiming/shooting.

## Coding Conventions
- TypeScript strict mode on; no `any` unless justified.
- One class per file under `entities/` and `systems/`, named after the file.
- Prefer composition over deep inheritance for entities.
- Keep magic numbers out of entity/system code — pull from `config.ts`.
- No comments explaining *what* code does; only *why*, and only when non-obvious
  (e.g. a balancing tradeoff, a Phaser quirk being worked around).

## Roadmap / Explicitly Out of Scope
Do not build these unless asked — they're intentionally deferred:
- Multiple tower *types* with different behaviors (only levels of the one turret)
- Tech tree beyond the linear Lv1–Lv8 upgrades
- Multiple lanes / enemies splitting across routes
- Multiple entries or shelters
- Persistence beyond the best-score cookie and the online scores (e.g. saved games,
  accounts; the "Press ? for controls" hint uses an in-memory flag)
- Sound design beyond basic SFX
