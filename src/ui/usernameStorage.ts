import { USERNAME_STORAGE_KEY } from '../config';
import { normalizeUsername } from '../../shared/username';

// Storage can throw (private mode, blocked site data); the in-memory copy keeps the name
// for this page load anyway.
let current: string | null | undefined;

export function readUsername(): string | null {
  if (current !== undefined) return current;
  try {
    current = normalizeUsername(window.localStorage.getItem(USERNAME_STORAGE_KEY) ?? '');
  } catch {
    current = null;
  }
  return current;
}

export function writeUsername(name: string | null): void {
  current = name;
  try {
    if (name === null) window.localStorage.removeItem(USERNAME_STORAGE_KEY);
    else window.localStorage.setItem(USERNAME_STORAGE_KEY, name);
  } catch {
    // Not remembered across reloads; nothing else depends on it.
  }
}
