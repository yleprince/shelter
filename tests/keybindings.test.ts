import { describe, expect, it } from 'vitest';
import { GAME_SPEEDS } from '../src/config';
import { GAME_BINDINGS, KEY_BINDINGS, tileEditAction, type BindingScene } from '../src/data/keybindings';
import { TILE_TYPE_ORDER, TILE_TYPES } from '../src/data/tileTypes';

const SCENES: BindingScene[] = ['game', 'mapSelect', 'gameOver', 'leaderboard'];

describe.each(SCENES)('%s key bindings', (scene) => {
  const sequences = KEY_BINDINGS.filter((b) => b.scene === scene).flatMap((b) => b.sequences.map((s) => s.join(' ')));

  it('binds no key sequence twice', () => {
    expect(new Set(sequences).size).toBe(sequences.length);
  });

  it('never makes a whole sequence the prefix of another, so every one can resolve', () => {
    for (const a of sequences) {
      for (const b of sequences) {
        if (a !== b) expect(b.startsWith(`${a} `), `${a} shadows ${b}`).toBe(false);
      }
    }
  });

  it('binds each action once', () => {
    const actions = KEY_BINDINGS.filter((b) => b.scene === scene).map((b) => b.action);
    expect(new Set(actions).size).toBe(actions.length);
  });
});

describe('key bindings', () => {
  it('only lets single-key bindings repeat', () => {
    for (const binding of KEY_BINDINGS.filter((b) => b.repeatable)) {
      for (const sequence of binding.sequences) expect(sequence).toHaveLength(1);
    }
  });

  it('describes each speed key with its GAME_SPEEDS value', () => {
    GAME_SPEEDS.forEach((speed, i) => {
      const binding = GAME_BINDINGS.find((b) => b.action === `speed${i + 1}`);
      expect(binding?.description).toBe(`Speed x${speed}`);
    });
  });

  it('binds r + each tile type edit key, in table order', () => {
    const tileBindings = GAME_BINDINGS.filter((b) => b.group === 'Tiles');
    expect(tileBindings.map((b) => b.action)).toEqual(TILE_TYPE_ORDER.map(tileEditAction));
    for (const type of TILE_TYPE_ORDER) {
      const binding = GAME_BINDINGS.find((b) => b.action === tileEditAction(type));
      expect(binding?.sequences).toEqual([['r', TILE_TYPES[type].editKey]]);
    }
    expect(GAME_BINDINGS.find((b) => b.action === 'tileWater')?.sequences).toEqual([['r', 'w']]);
    expect(GAME_BINDINGS.find((b) => b.action === 'tileFire')?.sequences).toEqual([['r', 'f']]);
    expect(GAME_BINDINGS.find((b) => b.action === 'tileIce')?.sequences).toEqual([['r', 'i']]);
  });

  it('binds U to max upgrade and S to the shelter upgrade', () => {
    expect(GAME_BINDINGS.find((b) => b.action === 'upgradeMax')?.sequences).toEqual([['U']]);
    expect(GAME_BINDINGS.find((b) => b.action === 'upgradeShelter')?.sequences).toEqual([['S']]);
  });
});
