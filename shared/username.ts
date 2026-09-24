// Shared by the game and the API server, so both accept exactly the same names.
// No imports: the server runs this file directly with Node's type stripping.

export const USERNAME_MAX_LENGTH = 16;

const USERNAME_PATTERN = /^[\p{L}\p{N} _.-]+$/u;

// Trims and collapses inner whitespace; null when nothing usable is left or a character
// isn't allowed. An empty name is valid input meaning "play anonymously" to callers.
export function normalizeUsername(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || [...name].length > USERNAME_MAX_LENGTH) return null;
  return USERNAME_PATTERN.test(name) ? name : null;
}
