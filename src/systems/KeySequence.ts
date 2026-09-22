export interface SequenceBinding<A> {
  sequences: readonly (readonly string[])[];
  action: A;
  repeatable?: boolean;
}

export type KeyResult<A> =
  | { kind: 'action'; action: A }
  | { kind: 'pending'; prefix: readonly string[] }
  | { kind: 'cancelled' }
  | { kind: 'none' };

export const ESCAPE = 'Escape';

// Turns single key presses into actions, vim style: a key that starts a longer sequence
// (g, d, r) waits for the next one until `timeoutMs` passes without a key.
export class KeySequence<A> {
  private buffer: string[] = [];
  private idleMs = 0;
  private readonly keys: ReadonlySet<string>;

  constructor(
    private readonly bindings: readonly SequenceBinding<A>[],
    private readonly timeoutMs: number,
  ) {
    this.keys = new Set(bindings.flatMap((b) => b.sequences.flat()));
  }

  get pending(): readonly string[] {
    return this.buffer;
  }

  isBound(key: string): boolean {
    return this.keys.has(key);
  }

  press(key: string, repeat = false): KeyResult<A> {
    if (repeat) {
      // Auto-repeat only drives repeatable single-key actions, never a sequence.
      const binding = this.buffer.length === 0 ? this.exact([key]) : undefined;
      return binding?.repeatable ? { kind: 'action', action: binding.action } : { kind: 'none' };
    }
    if (key === ESCAPE && this.buffer.length > 0) {
      this.reset();
      return { kind: 'cancelled' };
    }
    const candidate = [...this.buffer, key];
    const binding = this.exact(candidate);
    if (binding) {
      this.reset();
      return { kind: 'action', action: binding.action };
    }
    if (this.startsLonger(candidate)) {
      this.buffer = candidate;
      this.idleMs = 0;
      return { kind: 'pending', prefix: this.buffer };
    }
    // Like vim: a key that doesn't continue the pending sequence cancels it.
    const hadPending = this.buffer.length > 0;
    this.reset();
    return hadPending ? { kind: 'cancelled' } : { kind: 'none' };
  }

  // Returns true when a pending sequence just timed out.
  tick(deltaMs: number): boolean {
    if (this.buffer.length === 0) return false;
    this.idleMs += deltaMs;
    if (this.idleMs < this.timeoutMs) return false;
    this.reset();
    return true;
  }

  reset(): void {
    this.buffer = [];
    this.idleMs = 0;
  }

  private exact(keys: readonly string[]): SequenceBinding<A> | undefined {
    return this.bindings.find((b) => b.sequences.some((s) => sameKeys(s, keys)));
  }

  private startsLonger(keys: readonly string[]): boolean {
    return this.bindings.some((b) =>
      b.sequences.some((s) => s.length > keys.length && sameKeys(s.slice(0, keys.length), keys)),
    );
  }
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

// Maps a keyboard event to a binding key. Layout-aware keys come first, so '$' and '?'
// work wherever they sit; digits fall back to the physical key so AZERTY players get
// speeds 1–4 without holding Shift.
export function keyToken(key: string, code: string, isBound: (key: string) => boolean): string {
  const token = key === ' ' ? 'Space' : key;
  if (isBound(token)) return token;
  const digit = /^Digit(\d)$/.exec(code);
  return digit ? digit[1] : token;
}
