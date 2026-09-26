import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { getEmojiSuggestions, loadEmojiData } from './emojiSuggestions';

const LANGS = ['en', 'es', 'it', 'pt', 'de', 'ru', 'fr', 'da', 'sv', 'no', 'fi'];

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => {
    const file = url.split('/emoji/')[1];
    return new Response(readFileSync(`public/emoji/${file}`, 'utf8'));
  });
  await Promise.all(LANGS.map((l) => loadEmojiData(l)));
});

const top = (title: string, lang: string) => getEmojiSuggestions(title, 5, lang).map((r) => r.unicode);

// [lang, title, expected first suggestion]
const CASES: [string, string, string][] = [
  ['en', "Mom's birthday", '🎂'],
  ['en', 'Trip to Japan', '✈️'],
  ['en', 'Dentist', '🦷'],
  ['en', 'Exam', '📝'],
  ['en', 'Vacation', '🏖️'],
  ['en', 'Payday', '💰'],
  ['en', 'Moving day', '📦'],
  ['en', 'Due date', '👶'],
  ['en', 'Concert', '🎵'],
  ['da', 'Mors fødselsdag', '🎂'],
  ['da', 'Sommerferie', '🏖️'],
  ['da', 'Tandlæge', '🦷'],
  ['da', 'Eksamen', '📝'],
  ['da', 'Terminsprøve', '📝'],
  ['da', 'Flytning', '📦'],
  ['da', 'Løn', '💰'],
  ['da', 'Termin', '👶'],
  ['da', 'Fodboldkamp', '⚽'],
  ['de', 'Umzug', '📦'],
  ['de', 'Zahnarzt', '🦷'],
  ['de', 'Sommerurlaub', '🏖️'],
  ['es', 'Vacaciones en la playa', '🏖️'],
  ['es', 'Cumpleaños de Ana', '🎂'],
  ['it', 'Esame di storia', '📝'],
  ['it', 'Esame di maturità', '🎓'],
  ['pt', 'Casamento', '💒'],
  ['fr', 'Mariage', '💒'],
  ['fr', 'Déménagement', '📦'],
  ['ru', 'Отпуск', '🏖️'],
  ['ru', 'День рождения мамы', '🎂'],
  ['sv', 'Tentamen', '📝'],
  ['sv', 'Lönedag', '💰'],
  ['no', 'Lønning', '💰'],
  ['no', 'Hyttetur', '🏕️'],
  ['fi', 'Hammaslääkäri', '🦷'],
  ['fi', 'Kesäloma', '🏖️'],
  ['en', 'Snus-free', '🚭'],
  ['da', 'Snusfri', '🚭'],
  ['sv', 'Rökfri', '🚭'],
  // English titles typed with a non-English app language
  ['da', 'Wedding', '💒'],
  ['de', 'Deadline', '⏰'],
];

describe('getEmojiSuggestions', () => {
  it.each(CASES)('[%s] %s → %s', (lang, title, expected) => {
    expect(top(title, lang)[0]).toBe(expected);
  });

  it('ignores short filler words (no Tonga flag / tombstone for "to")', () => {
    const r = top('Trip to Japan', 'en');
    expect(r).not.toContain('🇹🇴');
    expect(r).not.toContain('🪦');
  });

  it('does not match 2-letter keywords across languages (pt "em" ≠ German EM)', () => {
    expect(top('Festa em casa', 'pt')[0]).toBe('🎉');
  });

  it('returns nothing for empty input', () => {
    expect(getEmojiSuggestions('   ')).toEqual([]);
  });
});
