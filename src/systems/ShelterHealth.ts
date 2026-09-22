import { SHELTER_REPAIR_BASE_COST, SHELTER_REPAIR_COST_PER_WAVE, SHELTER_REPAIR_RATIO } from '../config';
import { SHELTER_LEVELS, type ShelterLevel } from '../data/shelterLevels';
import type { Economy } from './Economy';
import { nextLevelBlocker, planUpgrade, type UpgradeBlocker, type UpgradePlan } from './UpgradePlan';

export type RepairBlocker = 'full' | 'too-expensive';

export function repairCost(wave: number): number {
  return SHELTER_REPAIR_BASE_COST + wave * SHELTER_REPAIR_COST_PER_WAVE;
}

export class ShelterHealth {
  private levelIndex = 0;
  private currentHp = SHELTER_LEVELS[0].maxHp;

  get level(): number {
    return this.stats.level;
  }

  get stats(): ShelterLevel {
    return SHELTER_LEVELS[this.levelIndex];
  }

  get nextLevel(): ShelterLevel | undefined {
    return SHELTER_LEVELS[this.levelIndex + 1];
  }

  get maxHp(): number {
    return this.stats.maxHp;
  }

  get hp(): number {
    return this.currentHp;
  }

  get isDestroyed(): boolean {
    return this.currentHp <= 0;
  }

  get repairAmount(): number {
    return Math.round(this.maxHp * SHELTER_REPAIR_RATIO);
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
    this.repair(this.repairAmount);
    return true;
  }

  upgradeBlocker(wave: number, balance: number): UpgradeBlocker | null {
    return nextLevelBlocker(SHELTER_LEVELS, this.level, wave, balance);
  }

  upgradeCost(): number | undefined {
    return this.nextLevel?.cost;
  }

  tryUpgrade(wave: number, economy: Economy): boolean {
    const next = this.nextLevel;
    if (!next || this.upgradeBlocker(wave, economy.balance) || !economy.spend(next.cost)) return false;
    this.raiseTo(next.level);
    return true;
  }

  upgradePlan(wave: number, balance: number): UpgradePlan {
    return planUpgrade(SHELTER_LEVELS, this.level, wave, balance);
  }

  maxUpgrade(wave: number, economy: Economy): boolean {
    const plan = this.upgradePlan(wave, economy.balance);
    if ('blocker' in plan || !economy.spend(plan.cost)) return false;
    this.raiseTo(plan.targetLevel);
    return true;
  }

  // Adds the max HP gained rather than healing fully: a full heal would make the upgrade
  // a cheaper repair right after a boss hit.
  private raiseTo(level: number): void {
    const before = this.maxHp;
    this.levelIndex = level - 1;
    this.currentHp += this.maxHp - before;
  }
}
