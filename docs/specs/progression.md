# Spec: Progression features (maps, game speed, tower levels, enemy tiers)

Status: **implemented** (2026-09-22)

Builds on the MVP described in `CLAUDE.md`. Several items listed there as "out of
scope for MVP" (multiple enemy types, tower upgrades, multiple paths) are brought in
scope by this spec; `CLAUDE.md` must be updated alongside the implementation.

All numbers below are **starting values** for playtesting. They live in
`src/config.ts` as named constants / tables, never inline.

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

## Code impact

New:
- `scenes/MapSelectScene.ts`
- `data/maps.ts` (replaces `data/path.ts`)
- `data/towerLevels.ts`, `data/enemyTiers.ts`: level / tier tables (or kept in
  `config.ts`; either way no numbers inline in entities/systems)
- `systems/GameClock.ts`: speed multiplier + fixed-step accumulator (plain TS)
- `systems/WaveComposer.ts` (or an extension of `WaveManager`): tier mix and boss
  waves (plain TS)
- UI: tower panel (upgrade / sell), speed buttons, repair button

Changed:
- `WaveManager`: per-wave spawn queue of `{ tier | boss }` instead of a single stat block
- `Enemy`: built from tier / boss stats, carries its own reward
- `Tower`: level, stats from level table, upgrade(), total invested
- `Economy`: unchanged API; used for upgrade / sell / repair
- `ScoreManager.computeFinal`: takes the map multiplier
- `Shelter`: `repair(amount)`
- `GameScene`: map id from scene data, fixed-step loop, tower selection
- `UIScene`, `GameOverScene`: new controls and score line
- `CLAUDE.md`, `README.md`: design sections, roadmap, controls

## Tests (Vitest)

- `GameClock`: step count per frame at each speed, delta cap, leftover accumulation.
- Wave composition: active tiers by wave, even split + remainder, ascending order,
  boss on every 10th wave with half escorts and boss last.
- Tower levels: upgrade gating by wave and cost, stats per level, sell refund.
- Score: map multiplier applied, rounding.
- Shelter repair: clamp at max, cost scaling, blocked when full / unaffordable.
- Maps: every map's waypoints are valid (orthogonal, in-bounds shelter).

## Still out of scope

- Multiple tower *types* (different behaviors); only levels of one turret
- Player-routed or multi-lane paths
- Pause
- Persistent high scores
- Sound beyond basic SFX
