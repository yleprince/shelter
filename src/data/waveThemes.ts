export type WaveThemeId = 'normal' | 'swarm' | 'tank' | 'rush' | 'elite';

export interface WaveTheme {
  id: WaveThemeId;
  name: string;
  // Shown once per game, the first time the theme comes up. Normal has none.
  intro?: string;
  countMultiplier: number;
  hpMultiplier: number;
  // Applied after the WAVE_SPEED_MAX_MULTIPLIER cap: rush breaks it on purpose, for one wave.
  speedMultiplier: number;
  // Offsets the count and HP changes so a themed wave pays about the same total scrap.
  rewardMultiplier: number;
  spawnIntervalMultiplier: number;
  // The whole wave is specials, split evenly between the active ones.
  specialsOnly: boolean;
}

// Non-boss waves from WAVE_THEMES_FROM_WAVE take WAVE_THEMES[wave % length], so index order
// is the rotation (201 swarm, 202 tank…) and boss waves, multiples of 10, land on normal.
export const WAVE_THEMES: readonly WaveTheme[] = [
  {
    id: 'normal',
    name: 'Normal',
    countMultiplier: 1,
    hpMultiplier: 1,
    speedMultiplier: 1,
    rewardMultiplier: 1,
    spawnIntervalMultiplier: 1,
    specialsOnly: false,
  },
  // Spawns twice as fast, so the wave lasts as long as a normal one.
  {
    id: 'swarm',
    name: 'Swarm',
    intro: 'twice as many enemies, half as tough',
    countMultiplier: 2,
    hpMultiplier: 0.5,
    speedMultiplier: 1,
    rewardMultiplier: 0.5,
    spawnIntervalMultiplier: 0.5,
    specialsOnly: false,
  },
  {
    id: 'tank',
    name: 'Tank',
    intro: 'half as many enemies, twice as tough and slower',
    countMultiplier: 0.5,
    hpMultiplier: 2,
    speedMultiplier: 0.8,
    rewardMultiplier: 2,
    spawnIntervalMultiplier: 1,
    specialsOnly: false,
  },
  {
    id: 'rush',
    name: 'Rush',
    intro: 'faster, frailer enemies',
    countMultiplier: 1,
    hpMultiplier: 0.75,
    speedMultiplier: 1.3,
    rewardMultiplier: 1,
    spawnIntervalMultiplier: 1,
    specialsOnly: false,
  },
  {
    id: 'elite',
    name: 'Elite',
    intro: 'half as many enemies, all specials',
    countMultiplier: 0.5,
    hpMultiplier: 1,
    speedMultiplier: 1,
    rewardMultiplier: 2,
    spawnIntervalMultiplier: 1,
    specialsOnly: true,
  },
];

export const NORMAL_THEME = WAVE_THEMES[0];
