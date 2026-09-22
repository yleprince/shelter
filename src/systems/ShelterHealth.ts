import { SHELTER_REPAIR_AMOUNT, SHELTER_REPAIR_BASE_COST, SHELTER_REPAIR_COST_PER_WAVE } from '../config';
import type { Economy } from './Economy';

export type RepairBlocker = 'full' | 'too-expensive';

export function repairCost(wave: number): number {
  return SHELTER_REPAIR_BASE_COST + wave * SHELTER_REPAIR_COST_PER_WAVE;
}

export class ShelterHealth {
  private currentHp: number;

  constructor(readonly maxHp: number) {
    this.currentHp = maxHp;
  }

  get hp(): number {
    return this.currentHp;
  }

  get isDestroyed(): boolean {
    return this.currentHp <= 0;
  }

  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  repair(amount: number): void {
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
  }

  repairBlocker(wave: number, balance: number): RepairBlocker | null {
    if (this.currentHp >= this.maxHp) return 'full';
    if (balance < repairCost(wave)) return 'too-expensive';
    return null;
  }

  tryRepair(wave: number, economy: Economy): boolean {
    if (this.repairBlocker(wave, economy.balance) || !economy.spend(repairCost(wave))) return false;
    this.repair(SHELTER_REPAIR_AMOUNT);
    return true;
  }
}
