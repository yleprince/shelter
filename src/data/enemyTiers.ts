export type TierId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
export type EnemyKind = TierId | 'boss';

export interface EnemyTier {
  id: TierId;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  appearsFrom: number;
  retiresAfter: number;
}

// Ordered weakest first: wave composition and spawn order rely on it.
export const ENEMY_TIERS: readonly EnemyTier[] = [
  { id: 'T1', hp: 30, speed: 50, damage: 10, reward: 10, appearsFrom: 1, retiresAfter: 14 },
  { id: 'T2', hp: 60, speed: 60, damage: 15, reward: 15, appearsFrom: 4, retiresAfter: 24 },
  { id: 'T3', hp: 120, speed: 45, damage: 20, reward: 25, appearsFrom: 7, retiresAfter: Infinity },
  { id: 'T4', hp: 200, speed: 70, damage: 25, reward: 35, appearsFrom: 10, retiresAfter: Infinity },
  { id: 'T5', hp: 400, speed: 55, damage: 40, reward: 60, appearsFrom: 13, retiresAfter: Infinity },
];
