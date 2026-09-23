import { describe, expect, it } from 'vitest';
import { BOSS_WAVE_INTERVAL } from '../src/config';
import { BOSSES } from '../src/data/bosses';
import { ENEMY_TEXTURES } from '../src/data/textures';
import { TOWER_LEVELS } from '../src/data/towerLevels';
import { armoredDamage } from '../src/systems/EnemyTraits';

describe('boss table', () => {
  it("keeps the brute on today's boss numbers", () => {
    expect(BOSSES[0]).toMatchObject({
      id: 'brute',
      hpMultiplier: 20,
      speedMultiplier: 0.5,
      damage: 50,
      reward: 200,
      appearsFrom: 10,
      traits: {},
    });
    expect(ENEMY_TEXTURES.brute).toBe('enemy-boss');
  });

  it('debuts every boss on a boss wave, in table order', () => {
    for (const boss of BOSSES) expect(boss.appearsFrom % BOSS_WAVE_INTERVAL).toBe(0);
    const debuts = BOSSES.map((b) => b.appearsFrom);
    expect(debuts).toEqual([...debuts].sort((a, b) => a - b));
    expect(new Set(debuts).size).toBe(debuts.length);
  });

  it('gives every boss its own texture', () => {
    const textures = BOSSES.map((b) => ENEMY_TEXTURES[b.id]);
    expect(new Set(textures).size).toBe(textures.length);
  });

  it('armors the juggernaut so only Lv7+ turrets get through', () => {
    const armor = BOSSES.find((b) => b.id === 'juggernaut')!.traits.armor!;
    const damage = (level: number) => armoredDamage(TOWER_LEVELS[level - 1].damage, armor);
    expect(damage(8)).toBe(110);
    expect(damage(7)).toBe(20);
    expect(damage(6)).toBe(1);
  });
});
