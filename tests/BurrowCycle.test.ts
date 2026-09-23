import { describe, expect, it } from 'vitest';
import { BurrowCycle } from '../src/systems/BurrowCycle';

describe('BurrowCycle', () => {
  it('starts on the surface, then alternates surface and underground', () => {
    const cycle = new BurrowCycle({ surfaceMs: 3000, undergroundMs: 2000 });
    expect(cycle.underground).toBe(false);
    cycle.update(2999);
    expect(cycle.underground).toBe(false);
    cycle.update(1);
    expect(cycle.underground).toBe(true);
    cycle.update(1999);
    expect(cycle.underground).toBe(true);
    cycle.update(1);
    expect(cycle.underground).toBe(false);
  });

  it('keeps its phase over large steps', () => {
    const cycle = new BurrowCycle({ surfaceMs: 3000, undergroundMs: 2000 });
    cycle.update(5000 * 7 + 3500);
    expect(cycle.underground).toBe(true);
  });
});
