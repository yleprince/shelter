# Spec: Progression features (maps, game speed, tower levels, enemy tiers)

Status: **implemented** on branch `feat/progression` (commit `df5d35c`, 2026-09-22).

Builds on the MVP described in `CLAUDE.md`. This spec brought several former
"out of scope for MVP" items into scope (multiple enemy types, tower upgrades, multiple
maps); `CLAUDE.md` was updated alongside the implementation and is the day-to-day
reference. This file keeps the **why** and the original numbers. Sections 1–5 are the
agreed design. **Implementation notes** explains how it was built and where the code
departs from the design. Read it before changing any of these features.

All numbers below are **starting values** for playtesting. They live in
`src/config.ts` (scalars) and `src/data/*.ts` (tables), never inline.

---

## 1. Map selection (3 maps)

- New `MapSelectScene` shown after `BootScene`, before `GameScene`.
- The player picks one of 3 maps. Each map has a **single fixed path**, as in the MVP.
  Enemies do not split across lanes and the player cannot reroute them.
- Maps differ in path length → difficulty → score multiplier:

| Map        | Difficulty | Path           | Score multiplier |
|------------|------------|----------------|------------------|
| Crossroads | Easy       | Long, winding  | x1.0             |
| Serpent    | Medium     | Medium         | x1.25            |
| Gauntlet   | Hard       | Short, direct  | x1.5             |

- `data/path.ts` becomes `data/maps.ts`: a list of map definitions
  `{ id, name, difficulty, scoreMultiplier, waypoints }`. The shelter is always at the
  last waypoint. Waypoint rules are unchanged (orthogonal segments, first waypoint
  off-map).
- **Final score = (survival + kills + saved scrap points) × map multiplier.** The game
  over screen shows the multiplier as its own line.
- **Game over screen** offers:
  - **Retry same map**: SPACE or button
  - **Change map**: button → `MapSelectScene`

## 2. Game speed (x1 / x2 / x10 / x50)

- HUD buttons `[x1] [x2] [x10] [x50]`, active one highlighted; keyboard shortcuts
  `1`–`4`.
- Speed persists across waves within a game; each new game starts at x1.
- Speed scales **simulated time**. Survival time in the score counts simulated
  seconds, so the score is identical regardless of speed.
- **Fixed-timestep simulation:** each frame's real delta × speed is consumed in fixed
  steps (`SIM_STEP_MS = 1000 / 60`). Without this, at x50 a single frame advances
  ~800 ms and projectiles tunnel through enemies. All gameplay updates (waves, enemies,
  towers, projectiles, score) run per step. Rendering stays per frame.
- Guard against a runaway loop after a tab stall: cap the accumulated real delta
  (`MAX_FRAME_DELTA_MS = 100`) before multiplying.

## 3. Tower levels (Lv1 → Lv5, upgrade in place)

- The player still places a single turret type, which starts at **Lv1**.
- Clicking a placed turret opens a **tower panel** showing its current stats plus:
  - **Upgrade → LvN (cost)**: disabled with a reason when locked by wave, too
    expensive, or already Lv5.
  - **Sell (+refund)**
- Clicking empty ground or pressing Esc closes the panel. Clicking a buildable tile
  while the panel is open closes it without placing.
- Each level changes damage, range and fire cooldown, plus the turret's look (tint /
  size / barrel so levels are readable at a glance).
- **Upgrades are gated by wave:** level N can only be bought once wave ≥ unlock wave.
- **Selling** refunds `TOWER_SELL_REFUND_RATIO = 0.6` × total scrap invested (placement +
  all upgrades), rounded down, and frees the tile.

| Level | Cost to reach | Total invested | Damage | Range | Cooldown (ms) | Unlock wave |
|-------|---------------|----------------|--------|-------|---------------|-------------|
| 1     | 50 (place)    | 50             | 10     | 120   | 600           | 1           |
| 2     | 60            | 110            | 16     | 130   | 550           | 1           |
| 3     | 100           | 210            | 26     | 140   | 500           | 5           |
| 4     | 160           | 370            | 42     | 155   | 450           | 10          |
| 5     | 250           | 620            | 70     | 170   | 400           | 15          |

## 4. Enemy tiers and waves

### Tiers

5 tiers, each with its own base stats. Tier stats are then scaled per wave (see below).

| Tier | Base HP | Base speed | Contact dmg | Reward | Appears from wave | Retires after wave |
|------|---------|------------|-------------|--------|-------------------|--------------------|
| T1   | 30      | 50         | 10          | 10     | 1                 | 14                 |
| T2   | 60      | 60         | 15          | 15     | 4                 | 24                 |
| T3   | 120     | 45         | 20          | 25     | 7                 | —                  |
| T4   | 200     | 70         | 25          | 35     | 10                | —                  |
| T5   | 400     | 55         | 40          | 60     | 13                | —                  |

Each tier has a distinct look (color / size) so the mix is readable.

### Wave composition

- Wave size keeps the MVP formula: `WAVE_BASE_ENEMY_COUNT + wave * WAVE_COUNT_INCREMENT`.
- **Active tiers** for a wave are those with `appearsFrom ≤ wave ≤ retiresAfter`.
- The enemy count is split **evenly** across active tiers. The remainder goes to the
  lowest active tiers. Composition is deterministic, which keeps it unit-testable.
- Spawn order is ascending tier (weak first), one every `WAVE_SPAWN_INTERVAL_MS`.
- Per-wave scaling still applies on top of tier base stats:
  - HP: `tierHp * (1 + wave * WAVE_HP_SCALE_PER_WAVE)`, with
    `WAVE_HP_SCALE_PER_WAVE` lowered from `0.25` to `0.1` because tiers now carry most
    of the HP growth.
  - Speed: `tierSpeed * min(1 + wave * WAVE_SPEED_SCALE_PER_WAVE, WAVE_SPEED_MAX_MULTIPLIER)`
- Kill reward: `tierReward + wave * ENEMY_KILL_REWARD_PER_WAVE`.

### Boss waves

- Every `BOSS_WAVE_INTERVAL = 10`th wave (10, 20, 30, …) spawns a **boss plus escorts**:
  - Escorts: a normal composition at `BOSS_WAVE_ESCORT_RATIO = 0.5` of the usual count,
    rounded up.
  - Boss: spawns **last**. HP = `BOSS_HP_MULTIPLIER = 20` × the wave-scaled HP of the
    highest active tier. Speed = `BOSS_SPEED_MULTIPLIER = 0.5` × T1 wave-scaled speed.
    Contact damage `BOSS_CONTACT_DAMAGE = 50`. Reward `BOSS_REWARD = 200`.
  - Distinct, larger sprite with a visible HP bar.
- The HUD announces boss waves during the preceding breather ("Boss wave in Ns").

## 5. Shelter repair

- HUD button **Repair +10 HP (cost)**, usable any time, including mid-wave.
- Repairs `SHELTER_REPAIR_AMOUNT = 10` HP, clamped to max HP.
- Cost: `SHELTER_REPAIR_BASE_COST + wave * SHELTER_REPAIR_COST_PER_WAVE` = `20 + 2 × wave`.
- The button is disabled when the shelter is at full HP or the player can't afford it.
- Scrap spent on repairs is gone, so it no longer counts as "saved" in the score.

---

## Implementation notes

### Where things live

| Concern | Code | Tests |
|---|---|---|
| Map definitions, `getMap`, `shelterTile` | `src/data/maps.ts` | `tests/maps.test.ts` |
| Map picker | `src/scenes/MapSelectScene.ts` (also exports `GameSceneData { mapId }`) | — |
| Speed + fixed step | `src/systems/GameClock.ts` | `tests/GameClock.test.ts` |
| Tower level table | `src/data/towerLevels.ts` (`TOWER_LEVELS`, `TOWER_PLACE_COST`) | — |
| Upgrade gating, invested scrap, sell value | `src/systems/TowerProgress.ts` | `tests/TowerProgress.test.ts` |
| Enemy tier table | `src/data/enemyTiers.ts` (`ENEMY_TIERS`, `TierId`, `EnemyKind`) | — |
| Tier mix, scaling, boss waves | `src/systems/WaveComposer.ts` (pure functions) | `tests/WaveComposer.test.ts` |
| Spawn queue, wave phases | `src/systems/WaveManager.ts` | `tests/WaveManager.test.ts` |
| Shelter HP, repair, repair cost | `src/systems/ShelterHealth.ts` | `tests/ShelterHealth.test.ts` |
| Score with map multiplier | `src/systems/ScoreManager.ts` | `tests/ScoreManager.test.ts` |
| Tile release on sell | `MapGrid.release()` | `tests/MapGrid.test.ts` |
| HUD, speed/repair buttons, tower panel | `src/scenes/UIScene.ts` | — |
| Selection, upgrade/sell/repair actions, step loop | `src/scenes/GameScene.ts` | — |

### How it's wired

- **Scene flow:** `BootScene → MapSelectScene → GameScene (+ UIScene) → GameOverScene`.
  `GameScene.init({ mapId })` rebuilds all state, so a retry is just
  `scene.start('GameScene', { mapId })`. `GameOverData` carries the `MapDefinition`
  so the retry button knows which map to replay.
- **Entities wrap systems.** `Tower` owns a `TowerProgress`, and `Shelter` owns a
  `ShelterHealth`. The Phaser classes only add sprites, tints and flashes, so every
  rule in sections 3 and 5 can be unit-tested without Phaser.
- **Enemies are data-driven.** `WaveManager.update()` returns `EnemySpec[]`
  (`kind, hp, speed, damage, reward`), already scaled for the wave by
  `WaveComposer`. `Enemy` just applies a spec and picks its texture from
  `ENEMY_TEXTURES[kind]`. The kill reward travels on the enemy.
- **Fixed-step loop.** `GameScene.update()` asks `GameClock.advance(delta)` how many
  steps to run, then calls `step(SIM_STEP_MS)` that many times. It stops early once the
  game is over. `Enemy.render()` and `Projectile.render()` sync sprites once per frame,
  after all the steps. Positions live in plain fields, not on the sprite.
- **UI reads, GameScene acts.** `UIScene` polls `GameScene` each frame
  (`selectedTower`, `clock`, `waves`, `economy`, `shelter`) and calls
  `upgradeSelected()` / `sellSelected()` / `repairShelter()`. The "why disabled" text
  comes from `TowerProgress.upgradeBlocker()` and `ShelterHealth.repairBlocker()`.
- **Click routing.** Phaser's `globalTopOnly` (default) makes an interactive object in
  `UIScene` swallow the pointer before `GameScene` sees it. The HUD background and the
  panel background are interactive for that reason. A hidden panel doesn't block,
  because Phaser skips children of invisible containers.

### Deviations from the design above

- **`HUD_ROWS` is 2, not 1.** The speed buttons and the repair button didn't fit on a
  single 40 px line. Line 1 shows stats and the wave, line 2 shows speed, repair and
  "Next wave". Paths must stay at row ≥ 2, and `tests/maps.test.ts` enforces this.
- **Crossroads is the old MVP path, shifted.** Its lower legs moved down one row
  (rows 12/13 → 13/14) so it clearly stays the longest map. Path lengths in tiles:
  Crossroads ≈ 56, Serpent 33, Gauntlet 23. A test checks that harder maps have
  strictly shorter paths.
- **The map name isn't shown in the HUD.** Line 1 would overflow once scrap and kills
  have more digits. The map is shown on map select and on game over.
- **Unlock waves compare against `waves.wave` literally.** During the first countdown
  that's 0, so Lv2 (unlock wave 1) stays locked until wave 1 starts. Change it to
  `Math.max(1, wave)` in `TowerProgress.upgradeBlocker` if that feels bad in play.
- **The repair cost uses the current wave (`waves.wave`).** It's 20 scrap during the
  first countdown.
- **Game over has no "click anywhere".** The MVP restarted on any click. There are now
  two buttons, so only the buttons and SPACE act.
- **Enemy HP bars scale with the sprite width,** so the boss bar is wider.
- **`GameClock` adds a 1e-9 epsilon** when turning time into steps.
  `SIM_STEP_MS = 1000/60` isn't exact in floating point, so whole multiples could come
  out one step short and slip to the next frame.
- **Removed config constants:** `TOWER_COST/DAMAGE/RANGE/FIRE_COOLDOWN_MS`,
  `ENEMY_BASE_HP/SPEED`, `ENEMY_CONTACT_DAMAGE` and `ENEMY_KILL_REWARD` were replaced by
  the data tables. `WAVE_HP_SCALE_PER_WAVE` went from 0.25 to 0.1, as specified.

### Verification status

- Covered by unit tests: everything listed in the table above, 44 tests in total.
- Played in a headless browser: map select, placement, the tower panel (including the
  "Not enough scrap" and "Unlocks at wave 5" reasons), upgrading Lv1 → Lv2, selling,
  x10/x50, game over with the multiplier line, and Change map.
- **Not yet seen in play:** a boss wave, tiers T2–T5 on screen, and repair from a
  damaged shelter. All three are unit-tested, but they still need a manual playtest.
  The balance numbers are also still untested.

## Still out of scope

- Multiple tower *types* (different behaviors); only levels of one turret
- Player-routed or multi-lane paths
- Pause
- Persistent high scores
- Sound beyond basic SFX
