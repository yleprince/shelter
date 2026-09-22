# CLAUDE.md

Guidance for Claude Code (and any future contributor) working in this repository.

## Project Overview

**Shelter** is a 2D top-down tower defense game. A single shelter sits at the end of a
fixed path; waves of raiders/mutants march down that path toward it, growing more
numerous and dangerous over time. The player places turrets along the path to kill
enemies before they reach the shelter. The longer the shelter survives, the higher the
score — combining survival time, enemies killed, and resources (currency) saved.

This repo is currently empty / pre-implementation. This file defines the intended
architecture and conventions so that implementation work stays consistent.

## Tech Stack

- **Phaser 3** — 2D game framework (rendering, scene management, physics, input)
- **TypeScript** — all game code
- **Vite** — dev server + build tooling
- Assets: free CC0 sprite packs from [Kenney.nl](https://kenney.nl) (e.g. the Tower
  Defense Kit for towers/path tiles, a zombie/survivor pack for enemies and the
  shelter), recolored/arranged for a post-apocalyptic tone. No paid or unlicensed
  assets.
- Deployment target: GitHub Pages, built from the Vite `dist/` output.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check and build production bundle to `dist/`
- `npm run preview` — preview the production build locally
- `npm run typecheck` — run `tsc --noEmit`

(These scripts should exist in `package.json`; if they don't yet, that means bootstrap
hasn't happened yet — set them up before writing game code.)

## Project Structure

```
shelter/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  public/
    assets/            # sprite sheets, audio, favicon — served as-is
  src/
    main.ts            # Phaser.Game bootstrap + config
    config.ts           # tunable constants (see Balancing below)
    scenes/
      BootScene.ts       # preload assets
      GameScene.ts        # core gameplay: path, towers, enemies, shelter
      UIScene.ts          # HUD overlay (currency, HP, wave, score) — runs parallel to GameScene
      GameOverScene.ts     # final score screen, restart
    entities/
      Enemy.ts
      Tower.ts
      Projectile.ts
      Shelter.ts
    systems/
      WaveManager.ts       # spawns waves, tracks wave number/difficulty
      Economy.ts           # currency balance, earn/spend
      ScoreManager.ts       # tracks survival time, kills, computes final score
    data/
      path.ts             # waypoint list the enemies follow
  CLAUDE.md
  README.md
```

Keep gameplay logic (entities/systems) decoupled from Phaser scene wiring where
practical — e.g. `ScoreManager` and `Economy` should be plain TS classes that
`GameScene`/`UIScene` read from and call into, not scenes themselves. This keeps them
unit-testable without a running Phaser instance.

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
- Single fixed, winding path from a map edge to the shelter (defined as an ordered
  list of waypoints in `data/path.ts`). No multiple lanes or player-editable path for
  MVP.
- Towers may only be placed on designated buildable tiles adjacent to the path, not on
  the path itself.

### Economy
- Player starts with a base currency amount (e.g. `100`).
- Placing a tower costs currency; insufficient currency blocks placement.
- Killing an enemy grants currency (flat amount, optionally with a small per-wave
  bonus).
- Currency remaining at any time counts as "resources saved" and feeds into the score.

### Wave & Difficulty Scaling
Each wave increases threat via **more enemies and tougher enemies** (not just faster
spawn pacing):
- Enemy count per wave: `base + wave * countIncrement`
- Enemy HP per wave: `baseHP * (1 + wave * hpScalePerWave)`
- Enemy speed per wave: `baseSpeed * (1 + wave * speedScalePerWave)`, capped at a
  max multiplier so it never becomes unfair/unreadable
- A short countdown/breather between waves gives the player time to place towers.

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
