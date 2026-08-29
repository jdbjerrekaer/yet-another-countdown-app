import { describe, expect, it } from 'vitest';
import { selectTodaysActivities } from './liveActivities';
import { CountdownEvent } from '@/types/countdown';

const strings = { today: 'Today', yearsToday: (y: number) => `${y} years today` };

const event = (over: Partial<CountdownEvent> & { id: string; targetDate: string }): CountdownEvent => ({
  title: 'Event',
  emoji: '🎉',
  isRecurring: false,
  createdAt: '2020-01-01T00:00:00.000Z',
  ...over,
});

const now = new Date(2026, 7, 29, 12, 0); // 29 Aug 2026, midday, local

describe('live activity selection', () => {
  it('takes only what lands today', () => {
    const picked = selectTodaysActivities(
      [
        event({ id: 'tomorrow', targetDate: new Date(2026, 7, 30, 9, 0).toISOString() }),
        event({ id: 'today', targetDate: new Date(2026, 7, 29, 20, 0).toISOString(), hasTime: true }),
        event({ id: 'yesterday', targetDate: new Date(2026, 7, 28, 9, 0).toISOString() }),
      ],
      now,
      strings,
    );
    expect(picked.map(a => a.eventId)).toEqual(['today']);
    expect(picked[0].targetDate).toBeTruthy();
  });

  it('counts up on an anniversary that already passed this morning', () => {
    const picked = selectTodaysActivities(
      [event({ id: 'wedding', targetDate: new Date(2023, 7, 29, 11, 0).toISOString(), isRecurring: true })],
      now,
      strings,
    );
    expect(picked[0].headline).toBe('3 years today');
    // Nothing left to tick down to — the day itself is the message.
    expect(picked[0].targetDate).toBeUndefined();
  });

  it('gives an all-day countdown no ticking timer', () => {
    const picked = selectTodaysActivities(
      [event({ id: 'trip', targetDate: new Date(2026, 7, 29, 18, 0).toISOString() })],
      now,
      strings,
    );
    expect(picked[0].headline).toBe('Today');
    expect(picked[0].targetDate).toBeUndefined();
  });

  it('keeps the three soonest and drops the rest', () => {
    const at = (h: number) => new Date(2026, 7, 29, h, 0).toISOString();
    const picked = selectTodaysActivities(
      [
        event({ id: 'd', targetDate: at(22) }),
        event({ id: 'a', targetDate: at(13) }),
        event({ id: 'c', targetDate: at(20) }),
        event({ id: 'b', targetDate: at(15) }),
      ],
      now,
      strings,
    );
    expect(picked.map(a => a.eventId)).toEqual(['a', 'b', 'c']);
  });
});
