import { describe, expect, it } from 'vitest';
import { BOSSES } from '../src/data/bosses';
import { WAVE_THEMES } from '../src/data/waveThemes';
import { bossesForWave, themeForWave } from '../src/systems/WaveComposer';
import { enemyIntro, themeIntro, waveBanner } from '../src/ui/labels';

describe('intros', () => {
  it('introduces specials and bosses, not tiers', () => {
    expect(enemyIntro('healer')).toBe('New: Healer · heals nearby enemies');
    expect(enemyIntro('juggernaut')).toMatch(/^New: Juggernaut · /);
    expect(enemyIntro('T3')).toBeUndefined();
  });

  it('introduces every theme but normal', () => {
    expect(themeIntro(WAVE_THEMES[0])).toBeUndefined();
    expect(themeIntro(WAVE_THEMES[3])).toMatch(/^New: Rush wave · /);
  });
});

describe('waveBanner', () => {
  const banner = (wave: number) => waveBanner(wave, bossesForWave(wave), themeForWave(wave));

  it('names the bosses, else the theme, else nothing', () => {
    expect(banner(170)).toBe('BOSS wave: Juggernaut');
    expect(banner(200)).toBe(`BOSS wave: ${BOSSES[0].name} + ${BOSSES[1].name}`);
    expect(banner(203)).toBe('Wave 203: Rush · faster, frailer enemies');
    expect(banner(205)).toBeUndefined();
    expect(banner(12)).toBeUndefined();
  });
});
