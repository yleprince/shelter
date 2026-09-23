import type { HealAura, JamAura, WarAura } from '../data/specialEnemies';
import type { Point } from './MapGrid';

export interface AuraEnemy extends Point {
  boss?: boolean;
  healAura?: HealAura;
  jamAura?: JamAura;
  warAura?: WarAura;
}

export interface AuraEffects {
  // Per enemy, in input order: share of its own max HP healed per second (0 = none).
  healRatioPerSec: number[];
  // Per enemy: the war aura it stands in, if any.
  war: (WarAura | undefined)[];
  // Per tower: cooldown multiplier (1 = not jammed).
  cooldownMultiplier: number[];
}

const inRange = (a: Point, b: Point, radius: number) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= radius * radius;

// Auras of one kind don't stack: the strongest in range applies. Nobody buffs itself, and
// heals skip bosses and other healers, or a few healers (or one boss) would be unkillable.
export function computeAuras(enemies: readonly AuraEnemy[], towers: readonly Point[]): AuraEffects {
  const healers = enemies.filter((e) => e.healAura);
  const warlords = enemies.filter((e) => e.warAura);
  const jammers = enemies.filter((e) => e.jamAura);

  const healRatioPerSec = enemies.map((enemy) => {
    if (enemy.boss || enemy.healAura) return 0;
    let best = 0;
    for (const healer of healers) {
      const aura = healer.healAura!;
      if (aura.ratioPerSec > best && inRange(enemy, healer, aura.radius)) best = aura.ratioPerSec;
    }
    return best;
  });

  const war = enemies.map((enemy) => {
    let best: WarAura | undefined;
    for (const warlord of warlords) {
      const aura = warlord.warAura!;
      if (warlord === enemy || (best && aura.speedMultiplier <= best.speedMultiplier)) continue;
      if (inRange(enemy, warlord, aura.radius)) best = aura;
    }
    return best;
  });

  const cooldownMultiplier = towers.map((tower) => {
    let best = 1;
    for (const jammer of jammers) {
      const aura = jammer.jamAura!;
      if (aura.cooldownMultiplier > best && inRange(tower, jammer, aura.radius)) best = aura.cooldownMultiplier;
    }
    return best;
  });

  return { healRatioPerSec, war, cooldownMultiplier };
}
