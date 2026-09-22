import type { SpecialId } from './specialEnemies';

export type TierId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8';
export type EnemyKind = TierId | SpecialId | 'boss';

export interface EnemyTier {
  id: TierId;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  appearsFrom: number;
  retiresAfter: number;
}

// Ordered weakest first: wave composition and spawn order rely on it. Tiers retire so the
// even split doesn't leave late waves half made of low-tier filler.
export const ENEMY_TIERS: readonly EnemyTier[] = [
  { id: 'T1', hp: 30, speed: 50, damage: 10, reward: 10, appearsFrom: 1, retiresAfter: 14 },
  { id: 'T2', hp: 60, speed: 60, damage: 15, reward: 15, appearsFrom: 4, retiresAfter: 24 },
  { id: 'T3', hp: 120, speed: 45, damage: 20, reward: 25, appearsFrom: 7, retiresAfter: 29 },
  { id: 'T4', hp: 200, speed: 70, damage: 25, reward: 35, appearsFrom: 10, retiresAfter: 34 },
  { id: 'T5', hp: 400, speed: 55, damage: 40, reward: 60, appearsFrom: 13, retiresAfter: Infinity },
  { id: 'T6', hp: 700, speed: 65, damage: 50, reward: 90, appearsFrom: 17, retiresAfter: Infinity },
  { id: 'T7', hp: 1200, speed: 50, damage: 60, reward: 130, appearsFrom: 21, retiresAfter: Infinity },
  { id: 'T8', hp: 2000, speed: 60, damage: 80, reward: 200, appearsFrom: 26, retiresAfter: Infinity },
];
