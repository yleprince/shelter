import { BEST_SCORE_COOKIE_MAX_AGE_S, BEST_SCORE_COOKIE_NAME } from '../config';
import { parseBestScore, serializeBestScore, type BestScoreRecord } from '../systems/BestScore';

// BASE_URL is relative ('./') so the build works under a GitHub Pages subpath; resolve it
// to an absolute path so the cookie doesn't leak to other projects on the same domain.
function cookiePath(): string {
  return new URL(import.meta.env.BASE_URL, window.location.href).pathname;
}

// document.cookie throws in some sandboxed contexts; blocked cookies just mean no best score.
export function readBestScore(): BestScoreRecord | null {
  try {
    const prefix = `${BEST_SCORE_COOKIE_NAME}=`;
    const entry = document.cookie.split('; ').find((c) => c.startsWith(prefix));
    return parseBestScore(entry?.slice(prefix.length));
  } catch {
    return null;
  }
}

export function writeBestScore(record: BestScoreRecord): void {
  try {
    document.cookie =
      `${BEST_SCORE_COOKIE_NAME}=${serializeBestScore(record)}; ` +
      `max-age=${BEST_SCORE_COOKIE_MAX_AGE_S}; path=${cookiePath()}; SameSite=Lax`;
  } catch {
    // Cookies blocked: the game plays the same without a best score.
  }
}
