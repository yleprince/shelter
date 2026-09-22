import { POINTS_PER_KILL, POINTS_PER_SAVED_CURRENCY, SURVIVAL_POINTS_PER_SEC } from '../config';

export interface ScoreBreakdown {
  survivalSeconds: number;
  kills: number;
  currencyRemaining: number;
  survivalPoints: number;
  killPoints: number;
  currencyPoints: number;
  subtotal: number;
  mapMultiplier: number;
  total: number;
}

export class ScoreManager {
  private elapsedMs = 0;
  private killCount = 0;

  get survivalSeconds(): number {
    return Math.floor(this.elapsedMs / 1000);
  }

  get kills(): number {
    return this.killCount;
  }

  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }

  addKill(): void {
    this.killCount++;
  }

  computeFinal(currencyRemaining: number, mapMultiplier: number): ScoreBreakdown {
    const survivalPoints = Math.floor(this.survivalSeconds * SURVIVAL_POINTS_PER_SEC);
    const killPoints = Math.floor(this.killCount * POINTS_PER_KILL);
    const currencyPoints = Math.floor(currencyRemaining * POINTS_PER_SAVED_CURRENCY);
    const subtotal = survivalPoints + killPoints + currencyPoints;
    return {
      survivalSeconds: this.survivalSeconds,
      kills: this.killCount,
      currencyRemaining,
      survivalPoints,
      killPoints,
      currencyPoints,
      subtotal,
      mapMultiplier,
      total: Math.floor(subtotal * mapMultiplier),
    };
  }
}
