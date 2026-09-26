// Slims emojibase-data into public/emoji/<lang>.json so the web app (fetch) and
// the native Siri/Shortcuts engine (bundle read) share one dataset.
// Run after bumping emojibase-data: `node scripts/build-emoji-data.mjs`
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// App language code -> emojibase locale
const LOCALES = { en: 'en', es: 'es', it: 'it', pt: 'pt', de: 'de', ru: 'ru', fr: 'fr', da: 'da', sv: 'sv', no: 'nb', fi: 'fi' };

mkdirSync('public/emoji', { recursive: true });
for (const [app, src] of Object.entries(LOCALES)) {
  const data = JSON.parse(readFileSync(require.resolve(`emojibase-data/${src}/compact.json`), 'utf8'));
  const rows = data
    .filter((e) => e.group !== undefined && e.group >= 0) // drop skin tones / components
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
    .map((e) => [e.unicode, e.label, e.tags ?? []]);
  writeFileSync(`public/emoji/${app}.json`, JSON.stringify(rows));
  console.log(app, rows.length);
}
