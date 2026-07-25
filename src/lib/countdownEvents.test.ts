import { describe, expect, it } from 'vitest';
import { createCountdownEvent, hasEventChanged, removeCountdownEvent, updateCountdownEvent } from './countdownEvents';
import { CountdownEvent } from '@/types/countdown';

const now = new Date('2026-07-13T10:00:00.000Z');

describe('countdown event CRUD', () => {
  it('creates an event with all appearance options intact', () => {
    const event = createCountdownEvent({
      title: 'Denmark trip',
      targetDate: '2026-08-01T12:30:00.000Z',
      emoji: '🇩🇰',
      emojiColor: '#dc143c',
      emojiShape: 'heart',
      isRecurring: false,
      hasTime: true,
      invertTimeFormat: true,
    }, 'event-1', now);

    expect(event).toEqual({
      id: 'event-1',
      title: 'Denmark trip',
      targetDate: '2026-08-01T12:30:00.000Z',
      emoji: '🇩🇰',
      emojiColor: '#dc143c',
      emojiShape: 'heart',
      isRecurring: false,
      hasTime: true,
      invertTimeFormat: true,
      createdAt: now.toISOString(),
      autoDelete: true,
    });
  });

  it('does not auto-delete near-term or recurring events', () => {
    const nearTerm = createCountdownEvent({
      title: 'Tomorrow',
      targetDate: '2026-07-14T10:00:00.000Z',
      emoji: '⏰',
      isRecurring: false,
    }, 'near', now);
    const recurring = createCountdownEvent({
      title: 'Birthday',
      targetDate: '2027-07-13T10:00:00.000Z',
      emoji: '🎂',
      isRecurring: true,
    }, 'recurring', now);

    expect(nearTerm.autoDelete).toBe(false);
    expect(recurring.autoDelete).toBe(false);
  });

  it('updates editable fields without losing identity or import metadata', () => {
    const original: CountdownEvent = {
      id: 'event-1',
      title: 'Original',
      targetDate: '2026-08-01T12:00:00.000Z',
      emoji: '🎉',
      emojiColor: '#3050bf',
      emojiShape: 'circle',
      isRecurring: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      isImported: true,
      importedFrom: 'Work',
      autoDelete: true,
    };

    const [updated] = updateCountdownEvent([original], original.id, {
      title: 'Updated',
      targetDate: '2026-09-01T15:45:00.000Z',
      emoji: '🏳️‍🌈',
      emojiColor: '#c94b8c',
      emojiShape: 'flower',
      isRecurring: true,
      hasTime: true,
      invertTimeFormat: true,
    });

    expect(updated).toMatchObject({
      id: original.id,
      createdAt: original.createdAt,
      isImported: true,
      importedFrom: 'Work',
      title: 'Updated',
      emoji: '🏳️‍🌈',
      emojiColor: '#c94b8c',
      emojiShape: 'flower',
      isRecurring: true,
    });
    expect(original.title).toBe('Original');
  });

  it('deletes only the requested event without mutating the input', () => {
    const first = createCountdownEvent({
      title: 'First', targetDate: '2026-08-01T00:00:00.000Z', emoji: '1️⃣', isRecurring: false,
    }, 'first', now);
    const second = createCountdownEvent({
      title: 'Second', targetDate: '2026-08-02T00:00:00.000Z', emoji: '2️⃣', isRecurring: false,
    }, 'second', now);
    const events = [first, second];

    expect(removeCountdownEvent(events, 'first')).toEqual([second]);
    expect(events).toHaveLength(2);
  });
});

describe('hasEventChanged', () => {
  const base = createCountdownEvent({
    title: 'Roskilde 🎪',
    targetDate: '2026-08-01T12:30:00.000Z',
    emoji: '🎪',
    emojiColor: '#dc143c',
    emojiShape: 'heart',
    isRecurring: false,
    hasTime: true,
    invertTimeFormat: true,
  }, 'event-1', now);

  const input = {
    title: base.title,
    targetDate: base.targetDate,
    emoji: base.emoji,
    emojiColor: base.emojiColor,
    emojiShape: base.emojiShape,
    isRecurring: base.isRecurring,
    hasTime: base.hasTime,
    invertTimeFormat: base.invertTimeFormat,
  };

  it('is false when nothing was edited', () => {
    expect(hasEventChanged(base, input)).toBe(false);
  });

  it('treats undefined and false optionals as equal', () => {
    const sparse: CountdownEvent = { ...base, emojiColor: undefined, emojiShape: undefined, invertTimeFormat: undefined };
    expect(hasEventChanged(sparse, { ...input, emojiColor: '', emojiShape: 'squircle', invertTimeFormat: false })).toBe(false);
  });

  it('is true when a field actually changed', () => {
    expect(hasEventChanged(base, { ...input, title: 'Sommerferie ✈️' })).toBe(true);
    expect(hasEventChanged(base, { ...input, targetDate: '2026-08-02T12:30:00.000Z' })).toBe(true);
    expect(hasEventChanged(base, { ...input, isRecurring: true })).toBe(true);
  });
});
