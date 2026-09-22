import { describe, expect, it } from 'vitest';
import { KEY_BINDINGS, type BindingScene } from '../src/data/keybindings';

const SCENES: BindingScene[] = ['game', 'mapSelect', 'gameOver'];

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
});
