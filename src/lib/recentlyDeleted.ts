import { Preferences } from '@capacitor/preferences';
import { CountdownEvent } from '@/types/countdown';

// Deleted countdowns are kept for 30 days so they can be recovered from the
// iOS Settings app (Settings ▸ Yet Another Countdown ▸ Recently Deleted).
//
// The Settings bundle is signed into the app and cannot grow rows at runtime,
// but a PSTitleValueSpecifier renders whatever string sits in its defaults key.
// So the app writes the real name and deletion date into SLOTS fixed keys and
// Settings shows them live; the toggle next to each row is the recover request,
// picked up the next time the app is opened.
const KEY = 'countdownsRecentlyDeleted';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const SLOTS = 5;
const EMPTY_LABEL = '—';

export interface DeletedEntry {
  event: CountdownEvent;
  deletedAt: string;
}

export function loadRecentlyDeleted(): DeletedEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: DeletedEntry[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - RETENTION_MS;
    return list
      .filter(e => e?.event?.id && new Date(e.deletedAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  } catch {
    return [];
  }
}

const save = (list: DeletedEntry[]) => localStorage.setItem(KEY, JSON.stringify(list));

const label = (entry: DeletedEntry, locale: string) => {
  const when = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
    new Date(entry.deletedAt),
  );
  return `${entry.event.emoji ?? ''} ${entry.event.title} · ${when}`.trim();
};

/** Mirror the (pruned) list into the fixed Settings.bundle slots. */
export async function publishRecentlyDeleted(locale = 'en'): Promise<DeletedEntry[]> {
  const list = loadRecentlyDeleted();
  save(list);
  for (let i = 0; i < SLOTS; i++) {
    const entry = list[i];
    await Preferences.set({
      key: `recently_deleted_${i + 1}`,
      value: entry ? label(entry, locale) : EMPTY_LABEL,
    });
  }
  return list;
}

export async function rememberDeleted(event: CountdownEvent, locale = 'en'): Promise<void> {
  const list = [
    { event, deletedAt: new Date().toISOString() },
    ...loadRecentlyDeleted().filter(e => e.event.id !== event.id),
  ];
  save(list);
  await publishRecentlyDeleted(locale);
}

export async function forgetDeleted(ids: string[], locale = 'en'): Promise<void> {
  save(loadRecentlyDeleted().filter(e => !ids.includes(e.event.id)));
  await publishRecentlyDeleted(locale);
}

/**
 * Read the per-slot "Recover" switches, clear them, and return the countdowns
 * they point at (dropping those from the recently-deleted list).
 */
export async function takeRecoverRequests(locale = 'en'): Promise<CountdownEvent[]> {
  const list = loadRecentlyDeleted();
  const recovered: CountdownEvent[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const key = `recover_${i + 1}`;
    const { value } = await Preferences.get({ key });
    if (value !== '1' && value !== 'true' && value !== 'YES') continue;
    await Preferences.set({ key, value: '0' });
    if (list[i]) recovered.push(list[i].event);
  }
  if (recovered.length) await forgetDeleted(recovered.map(e => e.id), locale);
  else await publishRecentlyDeleted(locale);
  return recovered;
}
