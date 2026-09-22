# Spec: Progression 2 (keyboard play, tile editing, more tiers, pause)

Status: **agreed design** (2026-09-23), not implemented yet. The choices made while
drafting are listed in [Decisions](#decisions).

Builds on `docs/specs/progression.md` and the current `CLAUDE.md`. This spec brings two
items that `CLAUDE.md` marks out of scope into scope: **pause**, and a limited form of
**player-routed paths** (tile editing). `CLAUDE.md` gets updated alongside the
implementation.

Goals:

1. **Vim bindings + help menu.** The whole game can be played with the keyboard only.
   A help overlay teaches the bindings.
2. **Tile editing.** The player pays scrap to turn a tile into **path**, **gravel**
   (enemies walk slower) or **ground** (buildable).
3. **More enemies and tower levels.** Stat tiers T6–T8, three special enemies with
   their own behavior, and tower levels Lv6–Lv8.
4. **Pause** on the space bar.

As before, every number below is a **starting value** for playtesting. Numbers live in
`src/config.ts` (scalars) and `src/data/*.ts` (tables), never inline.

---

## 1. Pause (Space)

- **Space** toggles pause in `GameScene`. The HUD also gets a pause button next to the
  speed buttons, so the mouse can pause too.
- `GameClock` gets a `paused` flag. While paused, `advance()` returns 0 steps and drops
  the delta. Nothing is saved up for later, so unpausing never causes a burst of steps.
- While paused, **all simulation stops**: enemies, towers, projectiles, the spawn queue,
  the breather countdown and survival time. Survival time counts simulated time, so
  pausing never changes the score.
- **Planning pause:** while paused the player can still place, upgrade and
  sell towers, edit tiles, repair the shelter and press "Next wave". The wave starts
  but nothing moves until they unpause. This is standard for the genre, and it makes
  keyboard play much less stressful.
- Changing speed while paused keeps the game paused. Unpausing resumes at the chosen
  speed.
- Visual: a dim overlay over the play area with `PAUSED · Space to resume`. The HUD
  stays readable.
- Opening the help menu (§2.5) pauses automatically. Closing it restores the pause state
  from before it opened.
- Each game starts unpaused, like speed x1.

## 2. Keyboard play and vim bindings

### 2.1 The tile cursor

- `GameScene` gets a **tile cursor**: an outline on one tile, drawn differently from the
  current green/red hover. It shows the same green/red validity and the range circle as
  the hover does today.
- The cursor and the mouse share **one** position. Moving the mouse moves the cursor,
  and pressing a movement key moves it without the mouse. The mouse hover and the
  cursor are the same thing.
- It starts on the shelter tile and is clamped to the playable area, so it never enters
  the HUD rows or the status line.

### 2.2 Bindings (in game)

Movement:

| Key | Action |
|---|---|
| `h` `j` `k` `l` / arrows | Move cursor 1 tile |
| `H` `J` `K` `L` | Move cursor 5 tiles |
| `0` / `$` | First / last column of the row |
| `gg` / `G` | Top / bottom playable row |
| `w` / `b` | Jump to next / previous tower (reading order) |
| `gs` | Jump to the shelter |

Actions on the cursor tile:

| Key | Action |
|---|---|
| `Enter` | Context action: place a turret on ground, open/close the panel on a tower |
| `i` | Place a turret |
| `u` | Upgrade the tower |
| `dd` | Sell the tower. It takes two keystrokes, so a stray key can't sell a Lv8 |
| `r` then `p` / `g` / `b` | Replace the tile with **p**ath / **g**ravel / **b**uildable ground (§3) |

Game:

| Key | Action |
|---|---|
| `Space` | Pause / resume |
| `1`–`4` | Speed x1 / x2 / x10 / x50 (unchanged) |
| `R` | Repair the shelter |
| `n` | Next wave (skip the breather) |
| `?` | Toggle the help menu |
| `Esc` | Cancel a pending key (`r`, `d`, `g`), close the panel, close help |

Notes:

- **No count prefixes** (`5l`). Digits already mean speed, and `H/J/K/L` cover the need.
- `u` means "upgrade" here, not vim's undo. Nothing in the game can be undone, so
  there's no conflict.
- Pending multi-key sequences (`r`, `d`, `g`) time out after `KEY_SEQUENCE_TIMEOUT_MS`
  (1000 ms), like vim's `timeoutlen`. Pending keys show in the status line (§2.4).
- The tower panel keeps its mouse buttons. It shows the key hint on each button
  (`Upgrade [u]`, `Sell [dd]`).
- Every HUD button also shows its key: `x1 [1]`, `Repair [R]`, `Next wave [n]`,
  `Pause [Space]`, `? help`.

### 2.3 Other scenes

| Scene | Keys |
|---|---|
| Map select | `j`/`k` (and `h`/`l`, arrows) move the highlight, `Enter` starts, `1`–`3` start directly (unchanged), `?` help |
| Game over | `Space` / `Enter` retry the same map, `m` changes map |

- **Game over input guard:** keys are ignored for `GAME_OVER_INPUT_DELAY_MS` (600 ms)
  after the screen appears. Space now also means pause, so a player who hits Space
  just as the shelter falls would otherwise retry without seeing their score.

### 2.4 Status line

- The bottom tile row becomes a **status line**, like vim's command line. It's a
  reserved `STATUS_ROWS = 1` strip, handled the same way as `HUD_ROWS`: no building, no
  path, and no tile editing there.
- Left side: the mode or pending keys (`-- PAUSED --`, `r…  p path 22 · g gravel 44 ·
  b ground 32`, `d…`).
- Right side: what's under the cursor (`Ground (buildable)`, `Gravel · enemies ×0.5`,
  `Tower Lv3`).
- All three maps already keep their paths at row ≤ 14, so reserving row 15 needs no map
  changes. `tests/maps.test.ts` gets the matching check.

### 2.5 Help menu

- `?` (or the `? help` HUD button) opens an overlay listing every binding in groups:
  **Move / Build / Tiles / Game**. `?` or `Esc` closes it. It pauses the game while open
  (§1).
- The overlay is **generated from the same table the key handler uses**:
  `src/data/keybindings.ts` (key, description, group, scene). So the help menu can't
  drift from the real bindings. A test checks that no key is bound twice in the same
  scene.
- Discoverability: the first time `GameScene` starts in a browser session, a toast
  shows `Press ? for controls` for a few seconds. It's a plain in-memory flag, not
  localStorage (persistence stays out of scope).
- Map select also shows `? help`, with its own short list.

### 2.6 Structure

- `src/data/keybindings.ts`: the binding table (data only).
- `src/systems/KeySequence.ts`: plain TS. Feed it key presses plus elapsed time, and it
  returns resolved actions (`'moveLeft'`, `'sell'`, `{ replaceTile: 'gravel' }`), the
  pending prefix, or a timeout. It's unit-tested for `gg`, `dd`, `r` + letter, timeouts
  and Esc.
- `src/systems/TileCursor.ts`: plain TS. It handles position, clamping, the motions
  (`0`, `$`, `gg`, `G`) and next/previous tower. It's unit-tested.
- Scenes only turn Phaser key events into `KeySequence` input, then dispatch the
  resulting actions to the existing `GameScene` methods (`upgradeSelected`, …),
  generalized to act on the cursor tile.

## 3. Tile editing (path / gravel / ground)

### 3.1 Tile types

| Type | Walkable | Buildable | Effect |
|---|---|---|---|
| Path | yes | no | Enemies walk at normal speed |
| Gravel | yes | no | Enemies walk at `GRAVEL_SPEED_MULTIPLIER = 0.5` × speed |
| Ground | no | yes (if free) | Towers can be placed |

- A map's `waypoints` now only define its **initial layout**: path tiles along the
  waypoints, ground everywhere else. The entry tile (the first in-bounds tile) and the
  shelter tile stay fixed for the whole game.
- `MapGrid` changes from "path set + occupied set" to a **tile-type grid**:
  `tileType()`, `setTileType()`, `isWalkable()`, and `isBuildable()` (ground, free, not
  in the HUD or status rows).

### 3.2 How enemies route

- New plain-TS system **`PathField`**: Dijkstra **from the shelter** over walkable tiles
  with 4-neighbours. Step cost is `1` on path and `1 / GRAVEL_SPEED_MULTIPLIER` on
  gravel, so enemies take the **fastest** route, not the shortest one. It stores each
  walkable tile's distance and next tile toward the shelter. Ties are broken in a fixed
  neighbour order, so the result is deterministic and testable.
- The field is recomputed after every edit. The grid is 24 × 16 tiles, so this is
  cheap.
- Enemies no longer follow a fixed waypoint list. Each enemy walks tile center to tile
  center. When it reaches a center, it asks `PathField` for the next tile. So an edit
  mid-wave just reroutes everyone from where they stand. The off-map lead-in (first
  waypoint → entry tile) stays a fixed straight segment. `PathFollower` becomes a
  tile-stepping follower, or gets replaced by one, and keeps its unit tests.
- Enemy speed is multiplied by the gravel factor while its position is on a gravel
  tile.
- Branches and dead ends are allowed. Enemies simply ignore any tile that isn't on the
  fastest route. All enemies still share **one** route (no lanes, no splitting).
- A consequence worth noting: gravel on the only route slows enemies, but gravel on
  one of two routes **diverts** them to the other one. That's intended: it gives the
  player a "mazing" tool.

### 3.3 Edit rules

An edit is refused (with a reason shown in the status line or tile panel, like
`upgradeBlocker()`) when:

- The tile is out of bounds, in the HUD rows or in the status line.
- It's the **shelter tile**, or the **entry tile** → ground. The entry tile *can* be
  turned into gravel.
- There is a tower on it. The player has to sell it first.
- Turning it into ground would put it under an enemy (or into the tile an enemy is
  walking toward).
- After the edit, no walkable route from the entry tile to the shelter would remain.
- The tile is already that type (no-op, no charge).
- The player can't afford it.

### 3.4 Cost

- `cost = TILE_EDIT_BASE_COST[type] + wave × TILE_EDIT_COST_PER_WAVE`. This follows the
  repair cost pattern, so edits don't become trivially cheap late game:

| Target type | Base cost | Why |
|---|---|---|
| Path | 15 | Lengthening the route is strong but needs many tiles |
| Gravel | 30 | Halves speed on that tile. The most direct defensive value |
| Ground | 20 | Mostly used to cut a path and free building space |

- `TILE_EDIT_COST_PER_WAVE = 1`.
- **No refunds.** Scrap spent on edits is gone, so it stops counting toward "resources
  saved" (like repair).
- Editing is allowed at any time, paused or not, mid-wave included, within the rules
  above.
- **Map score multipliers stay as they are**, even though the player can now lengthen
  Gauntlet's short path. Edits cost scrap, and spent scrap no longer counts as saved in
  the score. That's the balance for now. If playtesting shows that lengthening a short
  map is too cheap, the fallbacks are an edit cost that grows with each edit, or a
  per-map edit budget.

### 3.5 Controls and feedback

- Keyboard: `r` then `p` / `g` / `b` on the cursor tile. While `r` is pending, the
  status line lists the three options with their costs. The board shows a **route
  preview** (the route that would result, drawn faintly) for the option under
  consideration, or the current route.
- Mouse: **right-click** any editable tile to open a small **tile panel** (like the
  tower panel) with the three options, their costs and blocked reasons. A left-click on
  ground still places a turret, as today.
- Textures: new `TEXTURES.gravel`, drawn procedurally in `BootScene` like the rest.

### 3.6 Structure

- `src/systems/MapGrid.ts`: tile types (see §3.1).
- `src/systems/PathField.ts`: routing, reachability check. Unit-tested: initial map
  routes match the old waypoints, gravel diversion, disconnection detection,
  determinism.
- `src/systems/TileEditor.ts`: `editBlocker(tile, type, context)` and
  `editCost(type, wave)`. Pure logic, unit-tested.

## 4. More tower levels and enemies

### 4.1 Tower levels Lv6–Lv8

This extends `TOWER_LEVELS`. Lv1–Lv5 are unchanged.

| Level | Cost to reach | Total invested | Damage | Range | Cooldown (ms) | Unlock wave | DPS |
|-------|---------------|----------------|--------|-------|---------------|-------------|-----|
| 5     | 250           | 620            | 70     | 170   | 400           | 15          | 175 |
| 6     | 380           | 1000           | 110    | 180   | 370           | 20          | 297 |
| 7     | 560           | 1560           | 170    | 190   | 340           | 25          | 500 |
| 8     | 800           | 2360           | 260    | 200   | 300           | 30          | 867 |

- `TOWER_GUN_TEXTURES` grows to 8. Each new level needs a distinct look (tint, size,
  barrel).
- The tower panel and `TowerProgress` already read the table length, so no logic
  changes. The "max level" check must use `TOWER_LEVELS.length`, not `5`.

### 4.2 Enemy tiers T6–T8

This extends `ENEMY_TIERS`. The table stays ordered weakest first.

| Tier | Base HP | Base speed | Contact dmg | Reward | Appears from wave | Retires after wave |
|------|---------|------------|-------------|--------|-------------------|--------------------|
| T3   | 120     | 45         | 20          | 25     | 7                 | **29** (was —)     |
| T4   | 200     | 70         | 25          | 35     | 10                | **34** (was —)     |
| T5   | 400     | 55         | 40          | 60     | 13                | —                  |
| T6   | 700     | 65         | 50          | 90     | 17                | —                  |
| T7   | 1200    | 50         | 60          | 130    | 21                | —                  |
| T8   | 2000    | 60         | 80          | 200    | 26                | —                  |

- T3 and T4 now retire. The count is split evenly across active tiers, so without this,
  the late waves would stay half made of T3/T4 filler.
- Boss rules are unchanged. The boss takes its HP from the highest active tier, so from
  wave 30 on it's based on T8: `2000 × (1 + 30 × 0.1) × 20 = 160 000 HP` at wave 30.
  That's ~185 tower-seconds of Lv8 fire. **Balance is untested**, so we may need to
  lower `BOSS_HP_MULTIPLIER` once T8 is in.
- `TierId` becomes `'T1' … 'T8'`. `ENEMY_TEXTURES` gains `enemy-t6` … `enemy-t8`, with
  distinct looks.
- T6–T8 are stat-only tiers, like T1–T5. Behavior comes from the special enemies below.

### 4.3 Special enemies

Three enemies with one trait each. Every trait targets a different player tool, so no
single strategy covers everything:

| Special | Base HP | Base speed | Contact dmg | Reward | Appears from wave | Trait |
|---|---|---|---|---|---|---|
| Runner   | 40  | 110 | 10 | 20 | 6  | **Ignores gravel.** Its speed is never multiplied by `GRAVEL_SPEED_MULTIPLIER` |
| Armored  | 150 | 40  | 25 | 40 | 9  | **Armor:** each hit deals `max(damage − ARMORED_ARMOR, ARMOR_MIN_DAMAGE)`, with `ARMORED_ARMOR = 8` and `ARMOR_MIN_DAMAGE = 1` |
| Splitter | 180 | 50  | 20 | 30 | 12 | **Splits on death:** spawns `SPLITTER_CHILD_COUNT = 2` children where it died |

- **What each one counters.** The runner punishes relying on gravel alone. Armor makes
  many Lv1–Lv2 turrets weak (10 → 2 and 16 → 8 damage per hit), which pushes upgrades.
  The splitter punishes killing enemies right next to the shelter.
- **Stats scale per wave** like tiers (`scaledHp`, `scaledSpeed`, reward
  `+ wave × ENEMY_KILL_REWARD_PER_WAVE`). The runner is capped by
  `WAVE_SPEED_MAX_MULTIPLIER` like everyone else, so it tops out at 220 px/s. Armor is
  flat and doesn't scale.
- **Splitter children** use T1's wave-scaled stats and T1's look at a smaller scale.
  They give `SPLITTER_CHILD_REWARD_RATIO = 0.5` × T1's kill reward. Each child counts
  as a kill. They start at the parent's position, heading to the tile the parent was
  walking toward, then follow `PathField` as usual. They spawn outside the wave's
  spawn queue, so `WaveManager` has to count them as alive enemies before the wave
  counts as cleared. It already gets `enemies.length` every step.
- **Wave composition:** specials don't retire. From its appears-from wave, each special
  takes `ceil(count × SPECIAL_SHARE)` (with `SPECIAL_SHARE = 0.1`) out of the wave's
  normal count, so wave size is unchanged. The remaining count is split across tiers as
  today. Specials are **interleaved evenly** in the spawn order rather than spawning in
  a block, so a wave isn't a runner rush. This stays deterministic in `WaveComposer`.
- **Boss waves:** the escort composition includes specials too. The boss has no trait.
- **Data:** a new `src/data/specialEnemies.ts` (`SPECIAL_ENEMIES`, `SpecialId`).
  `EnemyKind` becomes `TierId | SpecialId | 'boss'`. `EnemySpec` gains optional
  trait fields: `armor`, `ignoresGravel` and `splitsInto`. `Enemy` applies them
  generically, with no `if (kind === 'runner')`.
- **Looks:** each special needs a silhouette you can read at a glance, not just a tint:
  runner = small and elongated, armored = square and plated, splitter = two lobes.
  New keys `enemy-runner`, `enemy-armored`, `enemy-splitter`.

## Implementation order

Each step ships on its own and keeps the game playable:

1. **Pause**: `GameClock.paused`, Space, overlay, HUD button. Smallest change.
2. **Levels, tiers and specials**: data tables, textures, `WaveComposer` share and
   interleaving, and the armor and split traits. The runner's gravel immunity is just a
   flag until step 4 adds gravel.
3. **Keyboard**: `keybindings.ts`, `KeySequence`, `TileCursor`, status line, help menu,
   bindings in all scenes.
4. **Tile editing**: `MapGrid` tile types, `PathField`, tile-stepping enemies,
   `TileEditor`, right-click panel, `r` bindings, route preview. The biggest change,
   done last, so the keyboard layer is already there to plug into.

## Test plan

- Unit (new): `KeySequence`, `TileCursor`, `PathField`, `TileEditor`, the
  `keybindings` uniqueness check, `GameClock` pause (0 steps while paused, no burst on
  resume).
- Unit (updated): `MapGrid` (tile types), `PathFollower` or its tile-stepping
  replacement, `WaveComposer` (T6–T8, retirements, the special share, interleaving,
  boss escorts with specials, unchanged wave size), `TowerProgress` (Lv8 max),
  `maps.test.ts` (status row free).
- Trait logic is tested without Phaser: armor damage (including the minimum of 1),
  the gravel multiplier skipped for `ignoresGravel`, and the child specs a splitter
  produces. These should be pure helpers in `WaveComposer` or a small `EnemyTraits`
  module.
- Manual playtest: a full game with the **keyboard only**. Also pause mid-wave at x50,
  cut and reroute the path mid-wave with enemies on it, gravel diversion, a boss wave
  with T8, each special on screen (and a runner crossing gravel), and the game over
  input guard.

## CLAUDE.md changes (at implementation time)

- Remove **Pause** and **player-routed paths** from "Out of scope". Replace them with
  "multiple lanes / enemies splitting across routes" and "multiple entries or
  shelters".
- Maps / Path: waypoints are the initial layout. Explain tile types, `PathField`
  routing, edit rules and the status row.
- Controls: point to `src/data/keybindings.ts` as the source of truth, instead of
  listing keys in two places.
- Entities: Enemy becomes eight tiers, three specials and the boss. Tower becomes
  Lv1–Lv8. Wave & Difficulty Scaling gains the special share and interleaving.
- Project structure: the new files.

## Decisions

Agreed on 2026-09-23 while drafting:

| # | Question | Decision | Rejected alternatives |
|---|---|---|---|
| 1 | Can the player act while paused? | **Yes, planning pause** (§1): build, upgrade, sell, edit, repair, next wave | Read-only pause. Build-only pause |
| 2 | Map score multiplier vs. lengthening short maps | **Keep the multipliers.** Edit cost and lost "saved scrap" are the balance (§3.4) | Edit cost that grows per edit. Per-map edit budget. Multiplier from actual route length |
| 3 | What "more enemies" means | **Tiers T6–T8 plus three specials**: runner, armored, splitter (§4.2, §4.3) | Tiers only. Specials only |
| 4 | Sell binding | **`dd`** (§2.2) | `x`. `x` with a confirm |
| 5 | Level / tier ceiling | **Lv8 / T8** (§4.1, §4.2) | Lv10 / T10. Lv7 / T7 |
| 6 | Mouse tile editing | **Right-click tile panel** (§3.5) | HUD edit-mode brush. Both |

Still open, to settle in playtest rather than on paper: all balance numbers,
especially the T8-based boss HP (§4.2), the special share, and armor vs. Lv1–Lv2
turrets.
