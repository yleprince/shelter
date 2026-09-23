import { BEST_SCORE_SEPARATOR } from '../config';
import { MAPS, type MapId } from '../data/maps';

export interface BestScoreRecord {
  score: number;
  mapId: MapId;
  wave: number;
}

function parseCount(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

// Anything unreadable counts as "no best yet" and gets overwritten at the next game over.
export function parseBestScore(raw: string | null | undefined): BestScoreRecord | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const parts = decoded.split(BEST_SCORE_SEPARATOR);
  if (parts.length !== 3) return null;
  const [scoreRaw, mapId, waveRaw] = parts;
  const score = parseCount(scoreRaw);
  const wave = parseCount(waveRaw);
  const map = MAPS.find((m) => m.id === mapId);
  if (score === null || wave === null || !map) return null;
  return { score, mapId: map.id, wave };
}

export function serializeBestScore(record: BestScoreRecord): string {
  return encodeURIComponent([record.score, record.mapId, record.wave].join(BEST_SCORE_SEPARATOR));
}

export function formatScore(score: number): string {
  return String(score).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatBestScore(record: BestScoreRecord): string {
  const map = MAPS.find((m) => m.id === record.mapId);
  return `Best ${formatScore(record.score)} · ${map?.name ?? record.mapId}, wave ${record.wave}`;
}

export function isNewBest(score: number, stored: BestScoreRecord | null): boolean {
  return stored === null || score > stored.score;
}
