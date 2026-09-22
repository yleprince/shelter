# CLAUDE.md

Guidance for Claude Code (and any future contributor) working in this repository.

## Project Overview

**Shelter** is a 2D top-down tower defense game. A single shelter sits at the end of a
fixed path; waves of raiders/mutants march down that path toward it, growing more
numerous and dangerous over time. The player places turrets along the path to kill
enemies before they reach the shelter. The longer the shelter survives, the higher the
score — combining survival time, enemies killed, and resources (currency) saved.

The MVP is implemented and playable. This file describes the architecture and
conventions so that further work stays consistent.

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
      GameScene.ts        # core gameplay: map, tower placement, enemies, projectiles, shelter
      UIScene.ts          # HUD overlay (scrap, shelter HP, kills, time, wave, "Next wave" button)
      GameOverScene.ts     # final score breakdown, restart on click/SPACE
    entities/
      Enemy.ts
      Tower.ts
      Projectile.ts
      Shelter.ts
    systems/
      WaveManager.ts       # wave phases (breather → spawning → clearing), per-wave stats
      Economy.ts           # currency balance, earn/spend
      ScoreManager.ts       # tracks survival time, kills, computes final score breakdown
      MapGrid.ts           # tile grid: path tiles, buildable/occupied tiles, tile↔world coords
      PathFollower.ts      # moves a point along world-space waypoints (used by Enemy)
    data/
      path.ts             # tile waypoints the enemies follow + shelter tile
      textures.ts          # texture keys and render depths
  tests/                 # Vitest specs for the plain-TS systems
  CLAUDE.md
  README.md
```

Keep gameplay logic (entities/systems) decoupled from Phaser scene wiring where
practical — e.g. `ScoreManager` and `Economy` should be plain TS classes that
`GameScene`/`UIScene` read from and call into, not scenes themselves. This keeps them
unit-testable without a running Phaser instance. Everything under `systems/` follows
this rule and has a matching spec in `tests/`; new systems should too.

## Core Game Design

### Entities
- **Shelter**: fixed position at the end of the path. Has HP (default `100`). Any
  enemy that reaches it deals its damage value to the shelter's HP and is removed.
  Game over when shelter HP reaches `0`.
- **Enemy** (single type for MVP): follows the fixed path waypoints at a constant
  speed, has HP and a contact-damage value, dies when HP reaches `0` (awards currency
  and a kill to the player).
- **Tower** (single type for MVP): placed by the player on valid non-path tiles near
  the path. Auto-targets the nearest enemy within range and fires projectiles on a
  cooldown. Costs currency to place.
- **Projectile**: spawned by a tower on fire, travels toward its target, deals damage
  on hit.

### Map / Path
- The map is a `TILE_SIZE` grid covering the canvas (`GAME_WIDTH` × `GAME_HEIGHT`).
  The top `HUD_ROWS` row(s) sit under the HUD bar.
- Single fixed, winding path from a map edge to the shelter, defined as an ordered
  list of tile waypoints in `data/path.ts`. Consecutive waypoints must share a row or
  column (`MapGrid` throws otherwise); the first waypoint is off-map so enemies walk in
  from the edge, and the last one is the shelter tile. No multiple lanes or
  player-editable path for MVP.
- Towers can be placed on any in-bounds tile that is not path, not under the HUD, and
  not already occupied (by a tower or the shelter). Hovering shows the tile in
  green/red plus the tower's range circle.

### Economy
- Currency is called **scrap** in the UI. Player starts with `STARTING_CURRENCY`.
- Placing a tower costs currency; insufficient currency blocks placement.
- Killing an enemy grants `ENEMY_KILL_REWARD + wave * ENEMY_KILL_REWARD_PER_WAVE`.
- Currency remaining at any time counts as "resources saved" and feeds into the score.

### Wave & Difficulty Scaling
Each wave increases threat via **more enemies and tougher enemies** (not just faster
spawn pacing):
- Enemy count per wave: `base + wave * countIncrement`
- Enemy HP per wave: `baseHP * (1 + wave * hpScalePerWave)`
- Enemy speed per wave: `baseSpeed * (1 + wave * speedScalePerWave)`, capped at a
  max multiplier so it never becomes unfair/unreadable
- Enemies within a wave spawn every `WAVE_SPAWN_INTERVAL_MS`.
- A `WAVE_BREATHER_MS` countdown precedes every wave (including the first) and starts
  once the previous wave is fully cleared. The HUD's "Next wave" button skips it.

All the constants above (`base`, increments, scale factors, starting currency, tower
cost/damage/range/fire-rate, shelter HP, enemy contact damage) belong in
`src/config.ts` as named constants — never hardcoded inline in entities/systems — so
balancing is a one-file change.

### Scoring
Final score combines all three axes discussed for this game:
```
score = survivalSeconds * SURVIVAL_POINTS_PER_SEC
      + totalKills * POINTS_PER_KILL
      + currencyRemaining * POINTS_PER_SAVED_CURRENCY
```
`ScoreManager` tracks survival time and kills live during play; the final value is
computed once and shown on `GameOverScene`. Point weights are constants in
`config.ts`.

### Controls (MVP)
- Click/tap a valid buildable tile to place a turret (if enough currency).
- Click "Next wave" in the HUD to skip the breather countdown.
- On the game over screen, click or press SPACE to restart.
- No manual aiming/shooting and no tower upgrades in the MVP — see Roadmap.

## Coding Conventions
- TypeScript strict mode on; no `any` unless justified.
- One class per file under `entities/` and `systems/`, named after the file.
- Prefer composition over deep inheritance for entities.
- Keep magic numbers out of entity/system code — pull from `config.ts`.
- No comments explaining *what* code does; only *why*, and only when non-obvious
  (e.g. a balancing tradeoff, a Phaser quirk being worked around).

## Roadmap / Explicitly Out of Scope for MVP
Do not build these unless asked — they're intentionally deferred:
- Multiple tower or enemy types
- Tower upgrades/tech tree
- Multiple paths/lanes
- Persistent high scores (e.g. localStorage leaderboard)
- Sound design beyond basic SFX
