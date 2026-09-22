import { POINTS_PER_KILL, POINTS_PER_SAVED_CURRENCY, SURVIVAL_POINTS_PER_SEC } from '../config';
import { TILE_TYPES } from '../data/tileTypes';

export interface ScoreBreakdown {
  survivalSeconds: number;
  // All kills, ice kills included, so the count compares across games.
  kills: number;
  iceKills: number;
  currencyRemaining: number;
  survivalPoints: number;
  // Points for the kills not made on ice.
  killPoints: number;
  iceKillPoints: number;
  currencyPoints: number;
  subtotal: number;
  mapMultiplier: number;
  total: number;
}

export class ScoreManager {
  private elapsedMs = 0;
  private killCount = 0;
  private iceKillCount = 0;

  get survivalSeconds(): number {
    return Math.floor(this.elapsedMs / 1000);
  }

  get kills(): number {
    return this.killCount;
  }

  get iceKills(): number {
    return this.iceKillCount;
  }

  tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
  }

  addKill(onIce = false): void {
    this.killCount++;
    if (onIce) this.iceKillCount++;
  }

  computeFinal(currencyRemaining: number, mapMultiplier: number): ScoreBreakdown {
    const survivalPoints = Math.floor(this.survivalSeconds * SURVIVAL_POINTS_PER_SEC);
    const killPoints = Math.floor((this.killCount - this.iceKillCount) * POINTS_PER_KILL);
    const iceKillPoints = Math.floor(this.iceKillCount * POINTS_PER_KILL * (TILE_TYPES.ice.killScoreMultiplier ?? 1));
    const currencyPoints = Math.floor(currencyRemaining * POINTS_PER_SAVED_CURRENCY);
    const subtotal = survivalPoints + killPoints + iceKillPoints + currencyPoints;
    return {
      survivalSeconds: this.survivalSeconds,
      kills: this.killCount,
      iceKills: this.iceKillCount,
      currencyRemaining,
      survivalPoints,
      killPoints,
      iceKillPoints,
      currencyPoints,
      subtotal,
      mapMultiplier,
      total: Math.floor(subtotal * mapMultiplier),
    };
  }
}
