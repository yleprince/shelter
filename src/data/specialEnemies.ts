import { ARMORED_ARMOR } from '../config';

export type SpecialId = 'runner' | 'armored' | 'splitter';

export interface SpecialTraits {
  armor?: number;
  ignoresGravel?: boolean;
  splits?: boolean;
}

export interface SpecialEnemy {
  id: SpecialId;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  appearsFrom: number;
  traits: SpecialTraits;
}

// One trait each, and each trait counters a different player tool: gravel, swarms of
// low-level turrets, and killing enemies right next to the shelter. Specials never retire.
export const SPECIAL_ENEMIES: readonly SpecialEnemy[] = [
  { id: 'runner', hp: 40, speed: 110, damage: 10, reward: 20, appearsFrom: 6, traits: { ignoresGravel: true } },
  { id: 'armored', hp: 150, speed: 40, damage: 25, reward: 40, appearsFrom: 9, traits: { armor: ARMORED_ARMOR } },
  { id: 'splitter', hp: 180, speed: 50, damage: 20, reward: 30, appearsFrom: 12, traits: { splits: true } },
];
