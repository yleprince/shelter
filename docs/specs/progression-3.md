# Spec: Progression 3 (speeds, best score, shelter upgrades, water, fire, ice)

Status: **draft** (2026-09-23). Not implemented yet. The choices made while drafting are
listed in [Decisions](#decisions).

Builds on `docs/specs/progression-2.md` and the current `CLAUDE.md`. This spec brings
one item that `CLAUDE.md` marks out of scope into scope: **persistence**, limited to a
single best-score cookie. `CLAUDE.md` gets updated alongside the implementation.

Goals:

1. **New game speeds:** x1 / x5 / x100 / x500 instead of x1 / x2 / x10 / x50.
2. **Best score cookie:** remember the player's best score across sessions.
3. **Water tiles:** a new tile type, unlocked at wave 150, slower than gravel.
4. **Speed back to x1 when the shelter is hit**, so fast-forward never hides a leak.
5. **Shelter upgrades:** the player pays scrap to raise the shelter's max HP.
6. **Fire tiles:** unlocked at wave 250, they damage enemies walking on them.
7. **Ice tiles:** they speed enemies up, but a kill on ice is worth much more score.

As before, every number below is a **starting value** for playtesting. Numbers live in
`src/config.ts` (scalars) and `src/data/*.ts` (tables), never inline.

---

## 1. Game speeds x1 / x5 / x100 / x500

### 1.1 Change

- `GAME_SPEEDS` becomes `[1, 5, 100, 500]`. Keys `1`–`4` and the HUD buttons keep
  their slots: `1` = x1, `2` = x5, `3` = x100, `4` = x500.
- Each game still starts at x1, unpaused. Pause, planning pause and "speed changes keep
  the pause" are unchanged.
- The key descriptions in `src/data/keybindings.ts` are hardcoded today
  (`'Speed x10'`). They get built from `GAME_SPEEDS` instead, so the help overlay can't
  drift from the real speeds again.
- The HUD speed buttons get wider (`x500 [4]` is two characters longer than
  `x50 [4]`). The HUD's second line must still fit at `GAME_WIDTH = 960`. If it
  doesn't, shorten the labels, not the key hints.

### 1.2 Simulation cost at x500

The fixed-step loop stays: every step is still `SIM_STEP_MS` (1/60 s), so projectiles
can't tunnel at any speed. The problem is the number of steps per frame:

| Speed | Steps per 16.7 ms frame | Steps per frame at `MAX_FRAME_DELTA_MS` (100 ms) |
|---|---|---|
| x50 (today) | 50 | 300 |
| x100 | 100 | 600 |
| x500 | 500 | 3000 |

Each step updates every enemy, tower and projectile. Late waves have hundreds of
enemies, so x500 can take longer to simulate than the frame lasts. The frame then
runs late, hands `GameClock` an even bigger delta, and the tab can lock up.

- New constant `MAX_SIM_STEPS_PER_FRAME` (starting value **600**). `GameClock.advance()`
  never returns more steps than this.
- Time over the cap is **dropped, not banked**, like paused time. So on a slow
  machine x500 just runs as fast as it can instead of freezing. The effective speed
  drops below x500, and that's acceptable.
- Survival time counts simulated steps, so the score stays independent of the real
  speed reached.
- Optional, only if the cap turns out to be hit often on normal hardware: show the
  real speed reached in the HUD (`x500 (≈x180)`). Left out of the first version.

### 1.3 Pacing notes

- At x500, the 8 s breather lasts 16 ms of real time and a wave's spawn interval is
  under 2 ms. Waves go by almost instantly. That's the point of x500 (fast-forward to
  late waves), and the player can pause at any moment. No change to breather or wave
  rules.
- A boss announcement during the breather won't be readable at x500. Accepted.

## 2. Best score cookie

### 2.1 What is stored

- **One best score per browser**, across all maps. The score already includes the map
  multiplier, so scores from different maps compare fairly.
- The stored record: `score`, `mapId` and `wave` reached. Enough to show
  `Best 12 345 · Gauntlet, wave 42`.
- Stored only when a game ends with a score **strictly higher** than the stored one.

### 2.2 Cookie format

- Name: `shelter_best`. Value: `score|mapId|wave`, URI-encoded
  (`12345%7Cgauntlet%7C42`).
- Attributes: `max-age` of one year (`BEST_SCORE_COOKIE_MAX_AGE_S`), `SameSite=Lax`,
  and `path` set to Vite's `import.meta.env.BASE_URL`. On GitHub Pages the game lives
  under `/<repo>/`, so a `path=/` cookie would leak to every other project on the same
  `*.github.io` domain.
- The game never sends it anywhere. A browser sends cookies with every request to the
  site, which here is just static file fetches from GitHub Pages. That's harmless and
  tiny.
- A missing, malformed or out-of-range value (not a finite integer ≥ 0, unknown map
  id) counts as "no best yet". It gets overwritten at the next game over. It never
  throws.
- If cookies are blocked, reading returns "no best yet" and writing does nothing. The
  game plays the same either way.

### 2.3 Where it shows

- **Game over:** under `SCORE`, show either `NEW BEST!` (highlighted) or
  `Best 12 345 · Gauntlet, wave 42`. If there was no previous best, the first score
  counts as a new best.
- **Map select:** a single line `Best 12 345 · Gauntlet, wave 42`, hidden when there's
  no best yet.
- Not in the in-game HUD. The score is only computed at game over.

### 2.4 Structure

- `src/systems/BestScore.ts`: plain TS, unit-tested. `parseBestScore(raw)`,
  `formatBestScore(record)`, and `isNewBest(score, stored)`. No `document` access.
- A tiny adapter reads and writes `document.cookie`: `src/ui/bestScoreCookie.ts`, or a
  `CookieJar` interface passed into `BestScore` so tests use a fake. Only the adapter
  touches the browser.
- The cookie name, max-age and separator live in `config.ts`.

## 3. Water tiles

### 3.1 Tile type

| Type | Walkable | Buildable | Effect |
|---|---|---|---|
| Path | yes | no | Normal speed |
| Gravel | yes | no | `GRAVEL_SPEED_MULTIPLIER = 0.5` × speed |
| **Water** | yes | no | `WATER_SPEED_MULTIPLIER = 0.25` × speed |
| Ground | no | yes (if free) | Towers can be placed |

- `TileType` gains `'water'`. `MapGrid.isWalkable()` already treats every non-ground
  type as walkable, so it needs no change.
- Routing: `PathField`'s step cost becomes `1 / terrain multiplier`, so water costs 4
  per tile against gravel's 2. The edge cost stays the average of both tiles. As with
  gravel, water on one of two routes diverts enemies to the other one.
- No map starts with water. It only comes from player edits.

### 3.2 Unlock

- New constant `WATER_UNLOCK_WAVE = 150`. Water can be placed once
  `wave ≥ WATER_UNLOCK_WAVE`, using the same "current wave" as tower level unlocks. So
  it becomes available when wave 150 starts, and stays available for the rest of the
  game.
- Before that, `editBlocker(tile, 'water', …)` returns a new blocker, **`'locked'`**,
  shown as `Water unlocks at wave 150`. It's checked right after `not-playable`, so a
  locked option always says why, whatever the tile.
- The tile panel shows the water option from the start, disabled with that reason.
  That way the player knows it exists before wave 150.

### 3.3 Cost

- `TILE_EDIT_BASE_COST.water = 60`, plus `wave × TILE_EDIT_COST_PER_WAVE` like every
  edit. At wave 150 that's 210 scrap (gravel costs 180 there).
- No refunds, as for all edits.

### 3.4 Enemy traits

- **Runner:** `ignoresGravel` stays gravel-only, so water **does** slow runners. Water
  becomes the late-game answer to them, and the trait keeps meaning exactly what its
  name says.
- `EnemyTraits.terrainSpeedMultiplier()` gets the water case. Tests cover water for
  both a normal enemy and a runner.
- The boss and splitter children follow the normal rules, so water slows them too.

### 3.5 Controls and feedback

- Keyboard: `r` then `w`, on the cursor tile. `rw` doesn't clash with anything: `w`
  alone (next tower) is only read when no `r` is pending.
  `tests/keybindings.test.ts` already checks for shadowed sequences.
- While `r` is pending, the status line lists the fourth option:
  `w water 210`, or `w water (wave 150)` while locked.
- Tile panel: a fourth option, `Water [rw]`, with its cost and blocker reason, and
  the same hover route preview as the others.
- Status line under the cursor: `Water · enemies ×0.25` (built from the constant in
  `labels.ts`, like gravel).
- Texture: new `TEXTURES.water`, drawn procedurally in `BootScene`. It must read as
  clearly different from gravel at a glance: blue with light ripple lines.

### 3.6 Reaching wave 150

Wave 150 is far beyond anything playtested so far: `4 + 150 × 2 = 304` enemies, HP
× 16, and T8-based bosses. The x500 speed (§1) is the practical way to get there and
check it, but **it's unknown whether a normal game can reach wave 150 at all**. If
playtesting shows it can't, the feature is invisible. The fix would be a data-only
change to `WATER_UNLOCK_WAVE`, not a redesign. See [Decisions](#decisions) #4.

## 4. Speed back to x1 when the shelter is hit

### 4.1 Rule

- When an enemy reaches the shelter and deals damage while the speed is above x1, the
  speed drops to **x1**. This goes with the new x100 / x500 speeds: at those speeds a
  leak can take half the shelter's HP before the player sees it.
- Only the speed changes. The pause state is untouched, and the game keeps running at
  x1. The player can speed up again right away.
- The status line shows `Shelter hit · speed back to x1` for `STATUS_MESSAGE_MS`, and
  the HUD's x1 button lights up as usual. No message at x1, since nothing changed.
- It triggers on **any** shelter damage: tiers, specials, splitter children and the
  boss. There's no damage threshold (see [Decisions](#decisions) #6).

### 4.2 Stopping the frame's remaining steps

`GameClock.advance()` hands out all of a frame's steps at once: up to
`MAX_SIM_STEPS_PER_FRAME` (600 steps = 10 s of game time) at x500. If the hit comes
on the first step and the loop keeps going, the game still runs 10 more seconds at
x500 before x1 takes effect. By then, the rest of the wave has hit the shelter too.

- New `GameClock.dropToBaseSpeed(): boolean`. It sets the speed to x1, **clears the
  accumulator**, and returns whether the speed actually changed.
- `GameScene`'s step loop **stops after the step where the drop happened**. The
  remaining steps are dropped, not saved for the next frame. From the next frame on,
  the game runs at x1.
- Several hits in the same step count as one drop, with one message.

### 4.3 Structure

- `GameClock`: `dropToBaseSpeed()`, unit-tested: returns `false` at x1, clears the
  accumulator, keeps the pause state, and `advance()` right after returns x1 steps.
- `GameScene`: calls it where the shelter takes damage, and breaks out of the step
  loop when it returns `true`.

## 5. Shelter upgrades

### 5.1 Levels

The shelter gets levels, like the turret, from a new table `src/data/shelterLevels.ts`
(`SHELTER_LEVELS`). Lv1 is today's shelter.

| Level | Cost to reach | Max HP | Unlock wave |
|-------|---------------|--------|-------------|
| 1     | —             | 100    | —           |
| 2     | 150           | 150    | 5           |
| 3     | 300           | 225    | 10          |
| 4     | 500           | 325    | 20          |
| 5     | 800           | 450    | 30          |

- `SHELTER_MAX_HP` moves into the table as Lv1's max HP.
- The unlock waves line up with the tower unlocks, so upgrading the shelter competes
  with upgrading turrets for the same scrap. It never replaces killing enemies:
  +350 HP is about four boss hits (`BOSS_CONTACT_DAMAGE = 50`) plus some leaks.
- **Upgrading adds the max HP increase to current HP**, so it doesn't fully heal
  (Lv2 → Lv3 at 40/150 HP gives 115/225). A full heal would make the upgrade a
  cheaper repair and make repair useless right after a boss hit.
- **No refunds and no downgrade.** Scrap spent on upgrades is gone, like repairs and
  tile edits, so it stops counting toward "resources saved".
- Refused (with a reason shown in the status line or on the button, like
  `upgradeBlocker()`) when: already at max level, the next level's unlock wave isn't
  reached (`Shelter Lv3 unlocks at wave 10`), or the player can't afford it.

### 5.2 Repair scales with max HP

A flat `SHELTER_REPAIR_AMOUNT = 10` barely matters on a 450 HP shelter.

- It becomes `SHELTER_REPAIR_RATIO = 0.1`: each repair restores `round(maxHp × 0.1)`
  HP, clamped to max. At Lv1 that's still +10, so today's balance doesn't change.
- The repair cost is unchanged (`base + wave × per-wave`). A repair at Lv5 gives
  4.5× as much HP for the same cost. That's part of what the upgrade buys.

### 5.3 Controls and feedback

- Keyboard: **`U`** upgrades the shelter from anywhere (like `R` repairs it).
  Also, `u` with the cursor on the shelter tile upgrades the shelter instead of
  refusing with "no tower here". It's the same action, so both `u` and `U` work there.
- HUD: a new `Shelter Lv2 → Lv3 (300) [U]` button next to Repair. It's disabled with
  the reason when blocked (`Shelter max level`, `Lv3 at wave 10`), like the repair
  button. The HUD stat reads `Shelter 115/225 Lv3`.
- The status line under the cursor on the shelter tile: `Shelter Lv3 · 115/225`.
- Look: the shelter gets a visual for each level (size, roof, extra walls), drawn in
  `BootScene` as `shelter-lv1` … `shelter-lv5`, like `TOWER_GUN_TEXTURES`. Hit and
  repair flashes are unchanged.
- The HUD's second line is getting full (speeds, pause, repair, upgrade, next wave,
  help). If it no longer fits at `GAME_WIDTH = 960`, shorten the labels first
  (`Upg Lv3 (300) [U]`). A click-on-shelter panel is the fallback, not part of this
  spec.

### 5.4 Structure

- `src/data/shelterLevels.ts`: the table (data only).
- `src/systems/ShelterHealth.ts` gains `level`, `upgradeBlocker(wave, balance)`,
  `upgradeCost()` and `tryUpgrade(wave, economy)`. `maxHp` stops being a constructor
  constant and comes from the current level. Unit-tested: HP added on upgrade, max
  level, unlock wave gating, cost, repair amount per level.
- `entities/Shelter.ts` swaps its texture on upgrade.
- `labels.ts`: shelter upgrade blocker texts. `keybindings.ts`: `upgradeShelter` on
  `U`.

## 6. Tile types become a data table

Water, fire and ice bring the tile types from three to six. Each has its own speed,
cost, unlock wave and, now, effects. Spreading these over `config.ts` constants and
`if (type === …)` chains in `PathField`, `EnemyTraits`, `TileEditor` and `labels.ts`
doesn't scale. So, like towers and tiers:

- New `src/data/tileTypes.ts`: `TILE_TYPES: Record<TileType, TileTypeDef>` with
  `walkable`, `speedMultiplier`, `editBaseCost`, `unlockWave`, `editKey` (the second
  key after `r`), and optional effects `damagePerSec` and `killScoreMultiplier`.
- `GRAVEL_SPEED_MULTIPLIER`, `WATER_SPEED_MULTIPLIER`, `WATER_UNLOCK_WAVE` and
  `TILE_EDIT_BASE_COST` move into it. `TILE_EDIT_COST_PER_WAVE` stays in `config.ts`.
- `PathField` step cost = `1 / speedMultiplier`. `EnemyTraits.terrainSpeedMultiplier`
  reads the table (the runner still skips only gravel's). `TileEditor`'s `locked`
  check reads `unlockWave`. The tile panel, the `r…` status line and the key bindings
  are built from the table, in its order.
- The `'locked'` blocker from §3.2 becomes generic: `<Type> unlocks at wave N`.

| Type | Walkable | Speed × | Edit base cost | Unlock wave | Key | Effect |
|---|---|---|---|---|---|---|
| Path   | yes | 1    | 15  | —   | `rp` | — |
| Gravel | yes | 0.5  | 30  | —   | `rg` | — |
| Ground | no  | —    | 20  | —   | `rb` | Buildable |
| Water  | yes | 0.25 | 60  | 150 | `rw` | — |
| Fire   | yes | 1    | 100 | 250 | `rf` | Damage over time (§7) |
| Ice    | yes | 1.5  | 40  | —   | `ri` | Speeds enemies up; score bonus on kill (§8) |

Do this refactor as the first step of the water work (§3), so water, fire and ice are
each just a new row plus their effect.

## 7. Fire tiles

### 7.1 Rule

- Walkable, normal speed (×1). Unlocks at wave **250** (`unlockWave`), the same way
  water does at 150.
- Every enemy whose position is on a fire tile takes damage every simulation step:
  `dps × SIM_STEP_MS / 1000`. It's continuous, so the time spent on fire is what
  counts. Slow enemies burn longer, which makes gravel or water next to fire a combo.
- **DPS scales with the wave**, because enemy HP does:
  `FIRE_DPS_BASE + wave × FIRE_DPS_PER_WAVE`, starting at **200 + 20 × wave**. That's
  5 200 DPS at wave 250, about six Lv8 turrets, on every enemy on the tile at once.
  A wave-250 T8 has `2000 × 26 = 52 000` HP and crosses a tile in about 0.3 s at
  the speed cap, so one fire tile takes ~3 % of its HP. Fire is a strip-length
  investment, not a single-tile trick.
- **Fire ignores armor.** Armor is subtracted per hit, and a per-step tick is only a
  few points, so armor would turn fire into its 1-damage minimum.
- The boss burns like everyone else. The flat DPS barely scratches its 20× HP, which
  is intended.
- A fire kill is a normal kill: scrap reward, kill count and score. A splitter that
  dies on fire spawns its children on fire, and they burn too.
- **Routing ignores fire.** `PathField` only looks at speed, and fire has speed ×1,
  so enemies walk into it as if it were path. Enemies avoiding damage would be a
  second routing rule and would turn fire into an expensive wall.

### 7.2 Feedback

- Texture `TEXTURES.fire`: orange and red flame tongues on dark ground, clearly
  different from path at a glance. A small alpha flicker in `GameScene` is optional.
- Enemies on fire get a brief orange tint, so the damage is visible.
- Status line under the cursor: `Fire · 5200 dmg/s` (current wave's value).

### 7.3 Structure

- `EnemyTraits.terrainDamage(type, wave, stepMs)`: pure, unit-tested (0 off fire,
  wave scaling, not reduced by armor).
- `Enemy` gets a `burn(amount)` path that skips `armoredDamage`. `GameScene` applies
  it per step and handles the resulting death exactly like a projectile kill.

## 8. Ice tiles

### 8.1 Rule

- Walkable, enemies move at **×1.5** speed (`speedMultiplier`). This applies on top
  of the wave speed cap, like gravel's slowdown does, and runners speed up too.
- **Available from the start** (no unlock wave), so the player can use the risk/reward
  from the first waves. It's one number in the table if it should unlock later.
- **Routing:** ice costs `1 / 1.5 ≈ 0.67` per tile, cheaper than path. Enemies take
  the fastest route, so **they're drawn onto ice**. That's the flip side of gravel
  diversion, and a mazing tool: an ice detour past a tower cluster can pull the whole
  wave through it.

### 8.2 Score bonus

- An enemy that dies while its position is on an ice tile counts as an **ice kill**:
  it's worth `ICE_KILL_SCORE_MULTIPLIER` × the usual kill points. Starting value
  **5**, so 50 points instead of 10.
- Only the score changes. The scrap reward is unchanged, so ice doesn't snowball the
  economy.
- The final formula becomes:
  ```
  score = floor(( survivalSeconds * SURVIVAL_POINTS_PER_SEC
                + normalKills * POINTS_PER_KILL
                + iceKills * POINTS_PER_KILL * ICE_KILL_SCORE_MULTIPLIER
                + currencyRemaining * POINTS_PER_SAVED_CURRENCY ) * mapScoreMultiplier)
  ```
- Splitter children and the boss count like any enemy. A splitter killed on ice
  counts as an ice kill, and its children only do if they die on ice too.
- The game over breakdown gets its own line: `Ice kills 37   +1850`. The kills line
  keeps counting all kills, so the numbers stay easy to compare between games.
- Feedback: a small `×5` popup at the enemy's position on an ice kill, so the player
  learns the rule without reading the help.

### 8.3 Risk

Ice makes enemies faster, so they spend less time in tower range and reach the
shelter sooner. The bonus pays for that risk. The case to watch in playtesting: a
long ice strip deep inside overlapping Lv8 range early on, where enemies die before
the speed matters. If that turns out to be free points, the fixes are a lower
multiplier, a higher edit cost, or an unlock wave.

### 8.4 Structure

- `ScoreManager.addKill(onIce: boolean)`, and the breakdown gains `iceKills` and
  `iceKillPoints`. Unit-tested with the formula above.
- `GameScene` checks the tile under a dying enemy (`MapGrid.worldToTile`) and passes
  `onIce`. The multiplier is read from `TILE_TYPES.ice.killScoreMultiplier`, so the
  scoring code doesn't name ice.
- Texture `TEXTURES.ice`: pale cyan with white streaks. It must be clearly different
  from water (deep blue ripples).

## Implementation order

Each step ships on its own and keeps the game playable:

1. **Speeds**: `GAME_SPEEDS`, `MAX_SIM_STEPS_PER_FRAME` in `GameClock`, key
   descriptions from `GAME_SPEEDS`, HUD fit. Smallest change, and it makes the rest
   quicker to test.
2. **Water**: the tile type table first (§6), then water: `PathField` cost,
   `EnemyTraits`, the `locked` blocker, `rw`, the tile panel option, texture.
3. **Speed drop on hit**: `GameClock.dropToBaseSpeed()` and the step loop break.
   Small, and best done right after the new speeds.
4. **Shelter upgrades**: table, `ShelterHealth` levels, repair ratio, `U`, HUD button,
   textures.
5. **Ice**: table row, `ScoreManager` ice kills, the breakdown line, popup, texture.
   Before best score, so the best score is recorded with the final formula.
6. **Fire**: table row, `terrainDamage`, `Enemy.burn`, tint, texture.
7. **Best score**: `BestScore`, cookie adapter, game over and map select display.

## Test plan

- Unit (updated): `GameClock` (new speeds, step cap, over-cap time dropped rather than
  banked, `dropToBaseSpeed`), `ShelterHealth` (levels, HP added on upgrade, gating,
  repair ratio), `PathField` (water cost 4, water diverts to a gravel route of equal length),
  `EnemyTraits` (water for normal enemies and runners), `TileEditor` (water `locked`
  before wave 150, allowed from 150, cost; fire locked before 250), `keybindings`
  (`rw`, `rf`, `ri`, speed descriptions match `GAME_SPEEDS`), `ScoreManager` (ice
  kills, the new formula), `PathField` (ice attracts: an ice detour beats a shorter
  path route).
- Unit (new): `tileTypes` table sanity (every `TileType` has a row, unique edit keys,
  ground is the only non-walkable type, speed multipliers > 0),
  `EnemyTraits.terrainDamage` (wave scaling, 0 off fire).
- Unit (new): `shelterLevels` table sanity (max HP and costs strictly increasing, Lv1
  free). `BestScore`: parsing valid, malformed, negative, non-integer and
  unknown-map values; formatting; "new best" is strictly higher; first score is a new
  best.
- Manual: x500 on a late wave (tab stays responsive, the cap engages), the HUD fits at
  x500, the best score survives a reload, the cookie path is the base URL in a
  production build (`npm run preview`), and blocked cookies. Water: placing it at
  wave 150 (reach it at x500), a runner crossing it, the route rerouting around it.
  Speed drop: a leak at x500 drops to x1 on the hit, with no extra hits from the
  rest of that frame, and the pause state is kept. Shelter: upgrade from `U`, from `u`
  on the shelter tile and from the HUD, texture per level, HUD fits. Fire at wave 250:
  enemies and armored enemies burn, fire kills pay scrap, a splitter's children
  burn. Ice: enemies speed up and reroute onto it, the `×5` popup, the ice kills line
  on game over. The tile panel with six options fits.

## CLAUDE.md changes (at implementation time)

- Game speed and pause: x1 / x5 / x100 / x500, the per-frame step cap, and the drop
  to x1 when the shelter is hit.
- Entities / Shelter: levels from `data/shelterLevels.ts`, HP added on upgrade, repair
  as a share of max HP (`SHELTER_REPAIR_RATIO`).
- Maps / Path: tile types from `data/tileTypes.ts` (path, gravel, ground, water,
  fire, ice), unlock waves and the `locked` refusal. Fire damage, and routing that
  looks at speed only. Runner: gravel only.
- Scoring: the formula with ice kills.
- Out of scope: replace "Persistent anything" with "Persistence beyond the best-score
  cookie (e.g. a leaderboard, saved games)".
- Project structure: `BestScore.ts`, the cookie adapter, `shelterLevels.ts` and
  `tileTypes.ts`.

## Decisions

Defaults picked while drafting (2026-09-23), open to change before implementation:

| # | Question | Decision | Alternatives |
|---|---|---|---|
| 1 | Best score scope | **One best across all maps.** The score already includes the map multiplier | One best per map |
| 2 | Storage | **A cookie**, as requested, path-scoped to the base URL | `localStorage`: simpler, never sent to the server |
| 3 | Does the runner ignore water? | **No.** Water is the late-game counter to runners | Runners ignore every slow terrain |
| 4 | Unlock point | **Wave 150**, as requested, as one constant | Lower it if playtesting shows wave 150 is out of reach |
| 5 | x500 on slow machines | **Cap steps per frame, drop the excess.** The game runs as fast as it can | Bank the excess (catch-up bursts). Lower the top speed |
| 6 | What triggers the drop to x1 | **Any shelter damage** | Only hits above a damage threshold. Drop one speed level instead of straight to x1. Pause instead |
| 7 | Upgrade heals? | **Adds the max HP increase to current HP** | Full heal. No heal |
| 8 | Repair amount | **10 % of max HP** (unchanged at Lv1) | Flat +10. A repair amount per level in the table |
| 9 | Shelter levels | **Lv1–Lv5, up to 450 HP** | More levels. Unlimited levels with a growing cost |
| 10 | Fire damage | **Wave-scaled DPS** (200 + 20 × wave) | Flat DPS (useless at wave 250). A share of max HP per second (melts bosses) |
| 11 | Fire vs. armor | **Ignores armor** | Armor per tick (turns fire off for armored) |
| 12 | Do enemies avoid fire? | **No**, routing looks at speed only | Add a damage cost to routing |
| 13 | Ice unlock | **From the start** (not given in the request) | An unlock wave, like water and fire |
| 14 | Ice score bonus | **×5 kill points, scrap unchanged** | ×3. Also a scrap bonus |
| 15 | Tile data | **One `tileTypes.ts` table** for all six types | Keep per-type constants in `config.ts` |
