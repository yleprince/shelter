export class Economy {
  private currency: number;

  constructor(startingCurrency: number) {
    this.currency = startingCurrency;
  }

  get balance(): number {
    return this.currency;
  }

  canAfford(cost: number): boolean {
    return this.currency >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.currency -= cost;
    return true;
  }

  earn(amount: number): void {
    this.currency += amount;
  }
}
