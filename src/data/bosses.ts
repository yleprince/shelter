import type { EnemyTraitSet } from './specialEnemies';

export type BossId = 'brute' | 'hiveQueen' | 'juggernaut' | 'warlord' | 'leviathan' | 'phoenix';

export interface BossDef {
  id: BossId;
  name: string;
  // Shown once per game, on the boss's debut: "New: <name> · <intro>".
  intro: string;
  // Applied to the strongest active tier's HP and to T1's speed, both scaled to the wave.
  hpMultiplier: number;
  speedMultiplier: number;
  damage: number;
  // Plus wave × BOSS_REWARD_PER_WAVE.
  reward: number;
  // Must be a boss wave: that wave is the boss's debut.
  appearsFrom: number;
  traits: EnemyTraitSet;
}

// Table order is also the pairing order: from BOSS_PAIR_FROM_WAVE the rotation's boss comes
// with the next active one in this list.
export const BOSSES: readonly BossDef[] = [
  {
    id: 'brute',
    name: 'Brute',
    intro: 'a huge, slow enemy',
    hpMultiplier: 20,
    speedMultiplier: 0.5,
    damage: 50,
    reward: 200,
    appearsFrom: 10,
    traits: {},
  },
  {
    id: 'hiveQueen',
    name: 'Hive Queen',
    intro: 'spawns escorts as it walks',
    hpMultiplier: 12,
    speedMultiplier: 0.5,
    damage: 60,
    reward: 300,
    appearsFrom: 150,
    traits: {
      spawner: { child: 'strongest', hpRatio: 0.3, rewardRatio: 0.3, everyMs: 5000, count: 4, maxTimes: 8 },
    },
  },
  // Armor 150 against the Lv6–Lv8 damages (110 / 170 / 260) leaves 1 / 20 / 110 per hit:
  // only top turrets, or fire, bring it down.
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    intro: 'heavy armor: only Lv7+ turrets or fire hurt it',
    hpMultiplier: 25,
    speedMultiplier: 0.35,
    damage: 100,
    reward: 350,
    appearsFrom: 170,
    traits: { armor: 150 },
  },
  {
    id: 'warlord',
    name: 'Warlord',
    intro: 'nearby enemies move faster and take less damage',
    hpMultiplier: 15,
    speedMultiplier: 0.6,
    damage: 70,
    reward: 300,
    appearsFrom: 190,
    traits: { warAura: { radius: 120, speedMultiplier: 1.3, damageTakenMultiplier: 0.7 } },
  },
  {
    id: 'leviathan',
    name: 'Leviathan',
    intro: 'not slowed by gravel or water',
    hpMultiplier: 18,
    speedMultiplier: 0.7,
    damage: 80,
    reward: 300,
    appearsFrom: 220,
    traits: { slowImmune: ['gravel', 'water'] },
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    intro: 'fireproof, rises once from its ashes',
    hpMultiplier: 12,
    speedMultiplier: 0.6,
    damage: 80,
    reward: 400,
    appearsFrom: 250,
    traits: { fireproof: true, revive: { hpRatio: 0.5, delayMs: 3000 } },
  },
];
