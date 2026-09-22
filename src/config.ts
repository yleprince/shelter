export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const TILE_SIZE = 40;
export const GRID_COLS = GAME_WIDTH / TILE_SIZE;
export const GRID_ROWS = GAME_HEIGHT / TILE_SIZE;
// Top row sits under the HUD bar, so nothing can be built there.
export const HUD_ROWS = 1;

export const STARTING_CURRENCY = 100;

export const SHELTER_MAX_HP = 100;

export const TOWER_COST = 50;
export const TOWER_DAMAGE = 10;
export const TOWER_RANGE = 120;
export const TOWER_FIRE_COOLDOWN_MS = 600;

export const PROJECTILE_SPEED = 400;
export const PROJECTILE_HIT_RADIUS = 8;

export const ENEMY_BASE_HP = 30;
export const ENEMY_BASE_SPEED = 50;
export const ENEMY_CONTACT_DAMAGE = 10;
export const ENEMY_KILL_REWARD = 10;
export const ENEMY_KILL_REWARD_PER_WAVE = 1;

export const WAVE_BASE_ENEMY_COUNT = 4;
export const WAVE_COUNT_INCREMENT = 2;
export const WAVE_HP_SCALE_PER_WAVE = 0.25;
export const WAVE_SPEED_SCALE_PER_WAVE = 0.05;
// Past ~2x speed, enemies cross tower range faster than players can read the board.
export const WAVE_SPEED_MAX_MULTIPLIER = 2;
export const WAVE_SPAWN_INTERVAL_MS = 900;
export const WAVE_BREATHER_MS = 8000;

export const SURVIVAL_POINTS_PER_SEC = 1;
export const POINTS_PER_KILL = 10;
export const POINTS_PER_SAVED_CURRENCY = 0.5;
