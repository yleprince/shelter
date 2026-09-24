import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from '../../server/config.ts';
import { parseGameSubmission, parseLimit, parseMapFilter } from '../../server/validation.ts';

const valid = { username: 'Bob', mapId: 'serpent', score: 1200, wave: 14, kills: 230, survivalSeconds: 600, durationMs: 180_000 };

describe('parseGameSubmission', () => {
  it('accepts a well-formed game', () => {
    expect(parseGameSubmission(valid)).toEqual({ ok: true, value: valid });
  });

  it('normalizes the name and treats a missing or blank one as anonymous', () => {
    expect(parseGameSubmission({ ...valid, username: '  Big   Bob ' })).toMatchObject({ value: { username: 'Big Bob' } });
    expect(parseGameSubmission({ ...valid, username: '   ' })).toMatchObject({ value: { username: null } });
    expect(parseGameSubmission({ ...valid, username: undefined })).toMatchObject({ value: { username: null } });
    expect(parseGameSubmission({ ...valid, username: null })).toMatchObject({ value: { username: null } });
  });

  it('refuses bad names, map ids and counts', () => {
    expect(parseGameSubmission({ ...valid, username: '<script>' }).ok).toBe(false);
    expect(parseGameSubmission({ ...valid, username: 42 }).ok).toBe(false);
    expect(parseGameSubmission({ ...valid, mapId: '../etc' }).ok).toBe(false);
    expect(parseGameSubmission({ ...valid, score: -1 }).ok).toBe(false);
    expect(parseGameSubmission({ ...valid, wave: 1.5 }).ok).toBe(false);
    expect(parseGameSubmission({ ...valid, kills: '3' }).ok).toBe(false);
    expect(parseGameSubmission({ ...valid, durationMs: undefined }).ok).toBe(false);
  });

  it('refuses anything but an object', () => {
    for (const body of [null, [], 'game', 3]) expect(parseGameSubmission(body).ok).toBe(false);
  });

  it('drops unknown fields', () => {
    expect(parseGameSubmission({ ...valid, id: 99, playedAt: 'yesterday' })).toEqual({ ok: true, value: valid });
  });
});

describe('parseLimit', () => {
  it('defaults when missing or invalid and caps large values', () => {
    expect(parseLimit(null)).toBe(DEFAULT_LIST_LIMIT);
    expect(parseLimit('zero')).toBe(DEFAULT_LIST_LIMIT);
    expect(parseLimit('0')).toBe(DEFAULT_LIST_LIMIT);
    expect(parseLimit('5')).toBe(5);
    expect(parseLimit('100000')).toBe(MAX_LIST_LIMIT);
  });
});

describe('parseMapFilter', () => {
  it('treats a missing map as all maps and refuses odd ids', () => {
    expect(parseMapFilter(null)).toEqual({ ok: true, value: null });
    expect(parseMapFilter('')).toEqual({ ok: true, value: null });
    expect(parseMapFilter('gauntlet')).toEqual({ ok: true, value: 'gauntlet' });
    expect(parseMapFilter("x' OR 1=1").ok).toBe(false);
  });
});
