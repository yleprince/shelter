# CLAUDE.md

Guidance for Claude Code (and any future contributor) working in this repository.

## Project Overview

**Shelter** is a 2D top-down tower defense game. The player picks one of three maps; a
single shelter sits at the end of that map's fixed path; waves of raiders/mutants march down that path toward it, growing more
numerous and dangerous over time. The player places turrets along the path to kill
enemies before they reach the shelter. The longer the shelter survives, the higher the
score — combining survival time, enemies killed, and resources (currency) saved.

The MVP plus the progression features in `docs/specs/progression.md` (map selection,
game speed, tower levels, enemy tiers and boss waves, selling, shelter repair) are
implemented. This file describes the architecture and conventions so that further work
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
- Deployment target: GitHub Pages, built from the Vite `dist/` output.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check and build production bundle to `dist/`
- `npm run preview` — preview the production build locally
- `npm run typecheck` — run `tsc --noEmit`
- `npm test` — run the Vitest suite in `tests/` once

## Project Structure

```
shelter/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  public/
    assets/            # (empty for now) sprite sheets, audio, favicon — served as-is
  src/
    main.ts            # Phaser.Game bootstrap + config
    config.ts           # all tunable gameplay constants (see Wave & Difficulty Scaling)
    scenes/
      BootScene.ts       # generates placeholder textures (later: preload sprites)
      MapSelectScene.ts   # pick one of the 3 maps (click or keys 1–3)
      GameScene.ts        # core gameplay: fixed-step loop, placement/selection, enemies, shelter
      UIScene.ts          # HUD overlay (stats, wave, speed, repair, "Next wave") + tower panel
      GameOverScene.ts     # final score breakdown, retry same map / change map
    entities/
      Enemy.ts
      Tower.ts
      Projectile.ts
      Shelter.ts
    systems/
      WaveManager.ts       # wave phases (breather → spawning → clearing), spawn queue
      WaveComposer.ts      # pure functions: active tiers, tier mix, boss waves, stat scaling
      GameClock.ts         # speed multiplier + fixed-step accumulator
      TowerProgress.ts     # tower level, upgrade gating, invested scrap, sell value
      ShelterHealth.ts     # shelter HP, damage, repair + repair cost
      Economy.ts           # currency balance, earn/spend
      ScoreManager.ts       # tracks survival time, kills, computes final score breakdown
      MapGrid.ts           # tile grid: path tiles, buildable/occupied tiles, tile↔world coords
      PathFollower.ts      # moves a point along world-space waypoints (used by Enemy)
    data/
      maps.ts             # the 3 map definitions (waypoints, difficulty, score multiplier)
      towerLevels.ts       # turret Lv1–Lv5 stat/cost/unlock table
      enemyTiers.ts        # enemy T1–T5 base stats and wave ranges
      textures.ts          # texture keys and render depths
  tests/                 # Vitest specs for the plain-TS systems and data tables
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
- **Shelter**: fixed position at the end of the path. Has HP (default `100`). Any
  enemy that reaches it deals its damage value to the shelter's HP and is removed.
  Game over when shelter HP reaches `0`. The player can repair it from the HUD at any
  time: `+SHELTER_REPAIR_AMOUNT` HP (clamped to max) for
  `SHELTER_REPAIR_BASE_COST + wave * SHELTER_REPAIR_COST_PER_WAVE` scrap.
- **Enemy**: five tiers (T1–T5, `data/enemyTiers.ts`) plus a boss, each with its own
  look. Follows the path at a constant speed, has HP, contact damage and a kill reward
  (all computed per wave by `WaveComposer`), dies when HP reaches `0`.
- **Tower**: a single turret type with levels Lv1–Lv5 (`data/towerLevels.ts`), placed
  at Lv1 on valid non-path tiles. Auto-targets the nearest enemy within range and fires
  on a cooldown. Clicking it opens a panel to upgrade in place (gated by wave and cost)
  or sell for `TOWER_SELL_REFUND_RATIO` × total invested, freeing the tile.
- **Projectile**: spawned by a tower on fire, travels toward its target, deals damage
  on hit.

### Maps / Path
- The map is a `TILE_SIZE` grid covering the canvas (`GAME_WIDTH` × `GAME_HEIGHT`).
  The top `HUD_ROWS` rows sit under the HUD bar; paths must stay below them.
- Three maps in `data/maps.ts` (Crossroads / Serpent / Gauntlet), chosen in
  `MapSelectScene`. Shorter paths are harder and carry a higher score multiplier.
- Each map has a single fixed path, an ordered list of tile waypoints. Consecutive
  waypoints must share a row or column (`MapGrid` throws otherwise); the first waypoint
  is off-map so enemies walk in from the edge, and the last one is the shelter tile.
  `tests/maps.test.ts` checks every map against these rules. No multiple lanes or
  player-editable paths.
- Towers can be placed on any in-bounds tile that is not path, not under the HUD, and
  not already occupied (by a tower or the shelter). Hovering shows the tile in
  green/red plus the tower's range circle.

### Economy
- Currency is called **scrap** in the UI. Player starts with `STARTING_CURRENCY`.
- Placing, upgrading and repairing cost currency; insufficient currency blocks them.
  Selling refunds part of what the tower cost.
- Killing an enemy grants `tierReward + wave * ENEMY_KILL_REWARD_PER_WAVE`; a boss
  grants a flat `BOSS_REWARD`.
- Currency remaining at any time counts as "resources saved" and feeds into the score.

### Wave & Difficulty Scaling
Each wave increases threat via **more enemies and tougher enemies** (not just faster
spawn pacing), composed by `WaveComposer`:
- Enemy count per wave: `WAVE_BASE_ENEMY_COUNT + wave * WAVE_COUNT_INCREMENT`
- Active tiers are those with `appearsFrom ≤ wave ≤ retiresAfter`. The count is split
  evenly across them, remainder to the weakest; spawn order is weakest first.
- Enemy HP per wave: `tierHp * (1 + wave * WAVE_HP_SCALE_PER_WAVE)`
- Enemy speed per wave: `tierSpeed * (1 + wave * WAVE_SPEED_SCALE_PER_WAVE)`, capped at
  `WAVE_SPEED_MAX_MULTIPLIER` so it never becomes unfair/unreadable
- Every `BOSS_WAVE_INTERVAL`th wave has `BOSS_WAVE_ESCORT_RATIO` of the usual count
  (rounded up) plus a boss spawned last, built from the strongest active tier's HP and
  T1's speed (see the `BOSS_*` constants). The HUD announces it during the breather.
- Enemies within a wave spawn every `WAVE_SPAWN_INTERVAL_MS`.
- A `WAVE_BREATHER_MS` countdown precedes every wave (including the first) and starts
  once the previous wave is fully cleared. The HUD's "Next wave" button skips it.

All the constants above (increments, scale factors, starting currency, boss, repair,
refund and speed settings, shelter HP) belong in `src/config.ts` as named constants,
and the per-level / per-tier / per-map tables in `src/data/`. Never hardcode them
inline in entities/systems, so balancing stays a data-only change.

### Game speed
- x1 / x2 / x10 / x50 (`GAME_SPEEDS`), picked from the HUD or keys 1–4; each game
  starts at x1.
- `GameClock` turns each frame's real delta (capped at `MAX_FRAME_DELTA_MS`) × speed
  into fixed `SIM_STEP_MS` steps. All gameplay (waves, enemies, towers, projectiles,
  score) updates per step; sprites render once per frame. Never feed the raw frame
  delta into gameplay: at x50 projectiles would tunnel through enemies.
- Survival time counts simulated time, so the score doesn't depend on speed.

### Scoring
Final score combines all three axes discussed for this game:
```
score = floor(( survivalSeconds * SURVIVAL_POINTS_PER_SEC
              + totalKills * POINTS_PER_KILL
              + currencyRemaining * POINTS_PER_SAVED_CURRENCY ) * mapScoreMultiplier)
```
`ScoreManager` tracks survival time and kills live during play; the final value is
computed once and shown on `GameOverScene`. Point weights are constants in
`config.ts`.

### Controls
- Map select: click a map card or press 1–3.
- Click/tap a valid buildable tile to place a turret (if enough currency).
- Click a turret to open its panel (upgrade / sell). Click elsewhere or press Esc to
  close it; a click on a buildable tile while it's open only closes it.
- HUD: speed buttons (or keys 1–4), "Repair", and "Next wave" to skip the breather.
- Game over: "Retry" (or SPACE) replays the same map; "Change map" returns to map
  select.
- No manual aiming/shooting and no pause.

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
- Tech tree beyond the linear Lv1–Lv5 upgrades
- Multiple lanes or player-routed paths
- Pause
- Persistent high scores (e.g. localStorage leaderboard)
- Sound design beyond basic SFX
