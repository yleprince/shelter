import { describe, expect, it } from 'vitest';
import { normalizeUsername, USERNAME_MAX_LENGTH } from '../shared/username';

describe('normalizeUsername', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeUsername('  Big   Bob ')).toBe('Big Bob');
  });

  it('accepts letters of any script, digits and . _ -', () => {
    expect(normalizeUsername('Zoé_42.x-y')).toBe('Zoé_42.x-y');
    expect(normalizeUsername('Ярослав')).toBe('Ярослав');
  });

  it('refuses empty, too long and markup-ish names', () => {
    expect(normalizeUsername('   ')).toBeNull();
    expect(normalizeUsername('a'.repeat(USERNAME_MAX_LENGTH))).not.toBeNull();
    expect(normalizeUsername('a'.repeat(USERNAME_MAX_LENGTH + 1))).toBeNull();
    expect(normalizeUsername('<b>bob</b>')).toBeNull();
    expect(normalizeUsername('bob;drop')).toBeNull();
  });
});
