import { CountdownEvent } from '@/types/countdown';

export type CountdownEventInput = Pick<
  CountdownEvent,
  'title' | 'targetDate' | 'emoji' | 'emojiColor' | 'emojiShape' | 'isRecurring' | 'hasTime' | 'invertTimeFormat'
>;

export function createCountdownEvent(
  input: CountdownEventInput,
  id: string,
  now: Date = new Date(),
): CountdownEvent {
  return {
    id,
    ...input,
    createdAt: now.toISOString(),
    autoDelete:
      !input.isRecurring &&
      new Date(input.targetDate).getTime() - now.getTime() > 2 * 24 * 60 * 60 * 1000,
  };
}

export function updateCountdownEvent(
  events: CountdownEvent[],
  id: string,
  changes: CountdownEventInput,
): CountdownEvent[] {
  return events.map((event) => event.id === id ? { ...event, ...changes } : event);
}

export function removeCountdownEvent(events: CountdownEvent[], id: string): CountdownEvent[] {
  return events.filter((event) => event.id !== id);
}
