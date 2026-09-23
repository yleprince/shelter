import { describe, expect, it } from 'vitest';
import {
  formatBestScore,
  formatScore,
  isNewBest,
  parseBestScore,
  serializeBestScore,
  type BestScoreRecord,
} from '../src/systems/BestScore';

const record: BestScoreRecord = { score: 12345, mapId: 'gauntlet', wave: 42 };

describe('BestScore', () => {
  it('serializes to a URI-encoded score|mapId|wave value', () => {
    expect(serializeBestScore(record)).toBe('12345%7Cgauntlet%7C42');
  });

  it('parses what it serializes', () => {
    expect(parseBestScore(serializeBestScore(record))).toEqual(record);
    expect(parseBestScore('0%7Ccrossroads%7C0')).toEqual({ score: 0, mapId: 'crossroads', wave: 0 });
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not URI-decodable', '%E0%A4%A'],
    ['too few parts', '12345%7Cgauntlet'],
    ['too many parts', '12345%7Cgauntlet%7C42%7C1'],
    ['negative score', '-5%7Cgauntlet%7C42'],
    ['non-integer score', '12.5%7Cgauntlet%7C42'],
    ['non-numeric score', 'abc%7Cgauntlet%7C42'],
    ['huge score', '99999999999999999999%7Cgauntlet%7C42'],
    ['negative wave', '12345%7Cgauntlet%7C-1'],
    ['non-integer wave', '12345%7Cgauntlet%7C4.2'],
    ['empty wave', '12345%7Cgauntlet%7C'],
    ['unknown map', '12345%7Cmoon%7C42'],
  ])('treats a %s value as no best yet', (_, raw) => {
    expect(parseBestScore(raw)).toBeNull();
  });

  it('formats the score with thousands separators, map name and wave', () => {
    expect(formatBestScore(record)).toBe('Best 12 345 · Gauntlet, wave 42');
    expect(formatScore(7)).toBe('7');
    expect(formatScore(1234567)).toBe('1 234 567');
  });

  it('counts the first score as a new best', () => {
    expect(isNewBest(0, null)).toBe(true);
  });

  it('needs a strictly higher score to be a new best', () => {
    expect(isNewBest(12346, record)).toBe(true);
    expect(isNewBest(12345, record)).toBe(false);
    expect(isNewBest(100, record)).toBe(false);
  });
});
