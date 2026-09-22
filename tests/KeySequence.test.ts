import { describe, expect, it } from 'vitest';
import { KeySequence, keyToken, type SequenceBinding } from '../src/systems/KeySequence';

type A = 'left' | 'top' | 'shelter' | 'sell' | 'path' | 'gravel' | 'cancel' | 'bottom';

const BINDINGS: SequenceBinding<A>[] = [
  { sequences: [['h'], ['ArrowLeft']], action: 'left', repeatable: true },
  { sequences: [['g', 'g']], action: 'top' },
  { sequences: [['g', 's']], action: 'shelter' },
  { sequences: [['G']], action: 'bottom' },
  { sequences: [['d', 'd']], action: 'sell' },
  { sequences: [['r', 'p']], action: 'path' },
  { sequences: [['r', 'g']], action: 'gravel' },
  { sequences: [['Escape']], action: 'cancel' },
];
const TIMEOUT = 1000;
const make = () => new KeySequence(BINDINGS, TIMEOUT);

describe('KeySequence', () => {
  it('resolves single keys and their alternatives at once', () => {
    const keys = make();
    expect(keys.press('h')).toEqual({ kind: 'action', action: 'left' });
    expect(keys.press('ArrowLeft')).toEqual({ kind: 'action', action: 'left' });
    expect(keys.press('G')).toEqual({ kind: 'action', action: 'bottom' });
  });

  it('waits on a prefix, then resolves gg, gs and dd', () => {
    const keys = make();
    expect(keys.press('g')).toEqual({ kind: 'pending', prefix: ['g'] });
    expect(keys.pending).toEqual(['g']);
    expect(keys.press('g')).toEqual({ kind: 'action', action: 'top' });
    expect(keys.pending).toEqual([]);
    keys.press('g');
    expect(keys.press('s')).toEqual({ kind: 'action', action: 'shelter' });
    keys.press('d');
    expect(keys.press('d')).toEqual({ kind: 'action', action: 'sell' });
  });

  it('resolves r followed by a tile letter, even one that is a prefix elsewhere', () => {
    const keys = make();
    keys.press('r');
    expect(keys.press('g')).toEqual({ kind: 'action', action: 'gravel' });
    keys.press('r');
    expect(keys.press('p')).toEqual({ kind: 'action', action: 'path' });
  });

  it('times out a pending prefix', () => {
    const keys = make();
    keys.press('d');
    expect(keys.tick(TIMEOUT - 1)).toBe(false);
    expect(keys.pending).toEqual(['d']);
    expect(keys.tick(1)).toBe(true);
    expect(keys.pending).toEqual([]);
    expect(keys.press('d')).toEqual({ kind: 'pending', prefix: ['d'] });
  });

  it('restarts the timeout on each key of a sequence', () => {
    const keys = make();
    keys.press('r');
    keys.tick(TIMEOUT - 1);
    expect(keys.press('p')).toEqual({ kind: 'action', action: 'path' });
    expect(keys.tick(TIMEOUT * 5)).toBe(false);
  });

  it('cancels a pending prefix on Esc without firing the Esc action', () => {
    const keys = make();
    keys.press('d');
    expect(keys.press('Escape')).toEqual({ kind: 'cancelled' });
    expect(keys.pending).toEqual([]);
    expect(keys.press('Escape')).toEqual({ kind: 'action', action: 'cancel' });
  });

  it('cancels a pending prefix on a key that does not continue it', () => {
    const keys = make();
    keys.press('d');
    expect(keys.press('h')).toEqual({ kind: 'cancelled' });
    expect(keys.pending).toEqual([]);
    expect(keys.press('x')).toEqual({ kind: 'none' });
  });

  it('only lets auto-repeat drive repeatable single keys', () => {
    const keys = make();
    expect(keys.press('h', true)).toEqual({ kind: 'action', action: 'left' });
    expect(keys.press('d', true)).toEqual({ kind: 'none' });
    keys.press('d');
    expect(keys.press('d', true)).toEqual({ kind: 'none' });
    expect(keys.pending).toEqual(['d']);
  });
});

describe('keyToken', () => {
  const bound = new Set(['1', '$', '0', '?', 'Space', 'h']);
  const isBound = (key: string) => bound.has(key);

  it('uses the layout key when it is bound', () => {
    expect(keyToken('$', 'Digit4', isBound)).toBe('$');
    expect(keyToken('?', 'Slash', isBound)).toBe('?');
    expect(keyToken('h', 'KeyH', isBound)).toBe('h');
  });

  it('names the space bar', () => {
    expect(keyToken(' ', 'Space', isBound)).toBe('Space');
  });

  it('falls back to the digit row for unshifted AZERTY digits', () => {
    expect(keyToken('&', 'Digit1', isBound)).toBe('1');
    expect(keyToken('à', 'Digit0', isBound)).toBe('0');
    expect(keyToken('x', 'KeyX', isBound)).toBe('x');
  });
});
