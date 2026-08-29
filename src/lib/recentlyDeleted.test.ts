import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return {
    Preferences: {
      set: async ({ key, value }: { key: string; value: string }) => void store.set(key, value),
      get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
      __store: store,
    },
  };
});

import { Preferences } from '@capacitor/preferences';
import { loadRecentlyDeleted, rememberDeleted, takeRecoverRequests } from './recentlyDeleted';
import { CountdownEvent } from '@/types/countdown';

const store = (Preferences as unknown as { __store: Map<string, string> }).__store;

// ponytail: the suite runs in node, and this module only needs get/set/clear.
const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
} as Storage;

const event = (id: string, title: string): CountdownEvent => ({
  id,
  title,
  targetDate: '2026-12-24T00:00:00.000Z',
  emoji: '🎄',
  isRecurring: false,
  createdAt: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => {
  localStorage.clear();
  store.clear();
});

describe('recently deleted', () => {
  it('drops entries older than 30 days and keeps the rest newest-first', () => {
    const day = 24 * 60 * 60 * 1000;
    localStorage.setItem(
      'countdownsRecentlyDeleted',
      JSON.stringify([
        { event: event('old', 'Old'), deletedAt: new Date(Date.now() - 31 * day).toISOString() },
        { event: event('a', 'A'), deletedAt: new Date(Date.now() - 5 * day).toISOString() },
        { event: event('b', 'B'), deletedAt: new Date(Date.now() - 1 * day).toISOString() },
      ]),
    );
    expect(loadRecentlyDeleted().map(e => e.event.id)).toEqual(['b', 'a']);
  });

  it('publishes a label per slot and recovers the one whose switch is on', async () => {
    await rememberDeleted(event('a', 'Trip'));
    await rememberDeleted(event('b', 'Exam'));

    expect(store.get('recently_deleted_1')).toContain('Exam');
    expect(store.get('recently_deleted_2')).toContain('Trip');
    expect(store.get('recently_deleted_1')).toContain('days left');
    expect(store.get('recently_deleted_3')).toBe('Empty');

    await Preferences.set({ key: 'recover_2', value: '1' });
    const recovered = await takeRecoverRequests();

    expect(recovered.map(e => e.id)).toEqual(['a']);
    expect(store.get('recover_2')).toBe('0');
    expect(loadRecentlyDeleted().map(e => e.event.id)).toEqual(['b']);
    expect(store.get('recently_deleted_2')).toBe('Empty');
  });
});
