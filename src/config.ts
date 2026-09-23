export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const TILE_SIZE = 40;
export const GRID_COLS = GAME_WIDTH / TILE_SIZE;
export const GRID_ROWS = GAME_HEIGHT / TILE_SIZE;
// The HUD needs two lines (stats, then controls), so the top two rows sit under it.
export const HUD_ROWS = 2;
// The bottom row is the vim-style status line: pending keys, messages, tile under the cursor.
export const STATUS_ROWS = 1;

export const STARTING_CURRENCY = 100;

// Shelter max HP and upgrade costs per level live in data/shelterLevels.ts.
// Share of max HP each repair restores, so repairs keep mattering on an upgraded shelter.
export const SHELTER_REPAIR_RATIO = 0.1;
export const SHELTER_REPAIR_BASE_COST = 20;
export const SHELTER_REPAIR_COST_PER_WAVE = 2;

// Tower stats per level live in data/towerLevels.ts.
export const TOWER_SELL_REFUND_RATIO = 0.6;

// Per-type edit costs, speeds and unlock waves live in data/tileTypes.ts.
export const TILE_EDIT_COST_PER_WAVE = 1;

export const PROJECTILE_SPEED = 400;
export const PROJECTILE_HIT_RADIUS = 8;

// Enemy base stats per tier live in data/enemyTiers.ts.
export const ENEMY_KILL_REWARD_PER_WAVE = 1;

// Special enemies live in data/specialEnemies.ts. Each one takes this share of a wave
// (rounded up) out of the normal count, so wave size doesn't change.
export const SPECIAL_SHARE = 0.1;
export const ARMORED_ARMOR = 8;
export const ARMOR_MIN_DAMAGE = 1;
export const SPLITTER_CHILD_COUNT = 2;
export const SPLITTER_CHILD_REWARD_RATIO = 0.5;
export const SPLITTER_CHILD_SCALE = 0.7;
// Children get this head start on each other so they don't render as one stacked sprite.
export const SPLITTER_CHILD_SPACING_PX = 10;

export const WAVE_BASE_ENEMY_COUNT = 4;
export const WAVE_COUNT_INCREMENT = 2;
// Tiers carry most of the HP growth, so per-wave scaling stays gentle.
export const WAVE_HP_SCALE_PER_WAVE = 0.1;
export const WAVE_SPEED_SCALE_PER_WAVE = 0.05;
// Past ~2x speed, enemies cross tower range faster than players can read the board.
export const WAVE_SPEED_MAX_MULTIPLIER = 2;
export const WAVE_SPAWN_INTERVAL_MS = 900;
export const WAVE_BREATHER_MS = 8000;

export const BOSS_WAVE_INTERVAL = 10;
export const BOSS_WAVE_ESCORT_RATIO = 0.5;
export const BOSS_HP_MULTIPLIER = 20;
export const BOSS_SPEED_MULTIPLIER = 0.5;
export const BOSS_CONTACT_DAMAGE = 50;
export const BOSS_REWARD = 200;

export const GAME_SPEEDS: readonly number[] = [1, 5, 100, 500];
export const SIM_STEP_MS = 1000 / 60;
// A stalled tab can hand us seconds of delta; at x500 that would be hours of simulation.
export const MAX_FRAME_DELTA_MS = 100;
// Late waves can take longer to simulate at x500 than a frame lasts; without a cap the next
// frame's bigger delta makes it worse until the tab locks up. Time over the cap is dropped.
export const MAX_SIM_STEPS_PER_FRAME = 600;

// Like vim's timeoutlen: how long a pending multi-key sequence (gg, dd, r…) waits.
export const KEY_SEQUENCE_TIMEOUT_MS = 1000;
// Space means pause in game, so a player mashing it as the shelter falls would otherwise
// retry before seeing their score.
export const GAME_OVER_INPUT_DELAY_MS = 600;
export const STATUS_MESSAGE_MS = 2500;

export const SURVIVAL_POINTS_PER_SEC = 1;
export const POINTS_PER_KILL = 10;
export const POINTS_PER_SAVED_CURRENCY = 0.5;

// One best score per browser, across all maps (the score already includes the map multiplier).
export const BEST_SCORE_COOKIE_NAME = 'shelter_best';
export const BEST_SCORE_COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;
export const BEST_SCORE_SEPARATOR = '|';
