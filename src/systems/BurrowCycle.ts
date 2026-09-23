import type { BurrowTrait } from '../data/specialEnemies';

// Surface first, then underground, repeating: surfaceMs, undergroundMs, surfaceMs…
export class BurrowCycle {
  private elapsedMs = 0;

  constructor(private readonly trait: BurrowTrait) {}

  get underground(): boolean {
    return this.elapsedMs >= this.trait.surfaceMs;
  }

  update(deltaMs: number): void {
    this.elapsedMs = (this.elapsedMs + deltaMs) % (this.trait.surfaceMs + this.trait.undergroundMs);
  }
}
