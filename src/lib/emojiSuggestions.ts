/**
 * Emoji suggestion engine powered by emojibase-data.
 *
 * Supports Danish (`da`) and English (`en`) locales.
 * Uses label + tags fields from the compact dataset to match user input.
 */

import enData from 'emojibase-data/en/compact.json';
import daData from 'emojibase-data/da/compact.json';

interface CompactEmoji {
  hexcode: string;
  label: string;
  tags?: string[];
  unicode: string;
  group?: number;
  order?: number;
}

// Cache for the search index per locale
const indexCache: Map<string, { tokens: Map<string, CompactEmoji[]>; all: CompactEmoji[] }> = new Map();

/**
 * Remove diacritics and lowercase for normalized matching.
 */
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Get supported locale key from navigator.language, falling back to 'en'.
 */
function getLocaleKey(): 'en' | 'da' {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  if (lang.startsWith('da')) return 'da';
  return 'en';
}

/**
 * Build or retrieve the cached search index for a given locale.
 */
function getIndex(locale: 'en' | 'da'): { tokens: Map<string, CompactEmoji[]>; all: CompactEmoji[] } {
  if (indexCache.has(locale)) {
    return indexCache.get(locale)!;
  }

  const data: CompactEmoji[] = locale === 'da' ? (daData as CompactEmoji[]) : (enData as CompactEmoji[]);

  // Build token -> emoji list mapping
  const tokens = new Map<string, CompactEmoji[]>();

  for (const emoji of data) {
    // skip component emojis (skin tones, hair, etc.)
    if (emoji.group === undefined || emoji.group < 0) continue;

    // Collect words from label + tags
    const words: string[] = [];
    words.push(...normalize(emoji.label).split(/\s+/));
    if (emoji.tags) {
      for (const tag of emoji.tags) {
        words.push(...normalize(tag).split(/\s+/));
      }
    }

    for (const word of words) {
      if (!word) continue;
      if (!tokens.has(word)) {
        tokens.set(word, []);
      }
      const list = tokens.get(word)!;
      // avoid duplicate entries
      if (!list.includes(emoji)) {
        list.push(emoji);
      }
    }
  }

  const index = { tokens, all: data };
  indexCache.set(locale, index);
  return index;
}

export interface EmojiResult {
  unicode: string;
  label: string;
}

/**
 * Get emoji suggestions based on the user query.
 *
 * Ranking:
 *  1. Exact word match in label or tag
 *  2. Prefix match
 *  3. Substring match
 *
 * @param query - user input (event name)
 * @param limit - maximum number of results (default 12)
 */
export function getEmojiSuggestions(query: string, limit = 12): EmojiResult[] {
  const locale = getLocaleKey();
  const { tokens, all } = getIndex(locale);

  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) {
    return [];
  }

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // Score each emoji based on match quality
  const scored = new Map<CompactEmoji, number>();

  function addScore(emoji: CompactEmoji, score: number) {
    scored.set(emoji, (scored.get(emoji) ?? 0) + score);
  }

  for (const qWord of queryWords) {
    // Exact match (highest score)
    const exactList = tokens.get(qWord);
    if (exactList) {
      for (const e of exactList) {
        addScore(e, 100);
      }
    }

    // Prefix + substring matches (iterate all tokens)
    for (const [token, emojis] of tokens.entries()) {
      if (token === qWord) continue; // already handled exact
      if (token.startsWith(qWord)) {
        for (const e of emojis) {
          addScore(e, 50);
        }
      } else if (token.includes(qWord)) {
        for (const e of emojis) {
          addScore(e, 10);
        }
      }
    }
  }

  // Sort by score descending, then by order if available
  const sorted = [...scored.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (a[0].order ?? 9999) - (b[0].order ?? 9999);
    });

  // Deduplicate by unicode
  const seen = new Set<string>();
  const results: EmojiResult[] = [];
  for (const [emoji] of sorted) {
    if (seen.has(emoji.unicode)) continue;
    seen.add(emoji.unicode);
    results.push({ unicode: emoji.unicode, label: emoji.label });
    if (results.length >= limit) break;
  }

  return results;
}
