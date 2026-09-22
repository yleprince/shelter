export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const TILE_SIZE = 40;
export const GRID_COLS = GAME_WIDTH / TILE_SIZE;
export const GRID_ROWS = GAME_HEIGHT / TILE_SIZE;
// The HUD needs two lines (stats, then controls), so the top two rows sit under it.
export const HUD_ROWS = 2;

export const STARTING_CURRENCY = 100;

export const SHELTER_MAX_HP = 100;
export const SHELTER_REPAIR_AMOUNT = 10;
export const SHELTER_REPAIR_BASE_COST = 20;
export const SHELTER_REPAIR_COST_PER_WAVE = 2;

// Tower stats per level live in data/towerLevels.ts.
export const TOWER_SELL_REFUND_RATIO = 0.6;

export const PROJECTILE_SPEED = 400;
export const PROJECTILE_HIT_RADIUS = 8;

// Enemy base stats per tier live in data/enemyTiers.ts.
export const ENEMY_KILL_REWARD_PER_WAVE = 1;

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

export const GAME_SPEEDS: readonly number[] = [1, 2, 10, 50];
export const SIM_STEP_MS = 1000 / 60;
// A stalled tab can hand us seconds of delta; at x50 that would be minutes of simulation.
export const MAX_FRAME_DELTA_MS = 100;

export const SURVIVAL_POINTS_PER_SEC = 1;
export const POINTS_PER_KILL = 10;
export const POINTS_PER_SAVED_CURRENCY = 0.5;
