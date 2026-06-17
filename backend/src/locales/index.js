import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fakerPkg from '@faker-js/faker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'locales');

// Adding/removing/updating a language means adding/removing/editing a JSON file here —
// nothing in this module (or anywhere else in the source) hardcodes a language, region,
// or piece of locale-specific vocabulary.
const localeFiles = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));

const locales = new Map();
for (const file of localeFiles) {
  const raw = readFileSync(path.join(LOCALES_DIR, file), 'utf-8');
  const data = JSON.parse(raw);
  const fakerInstance = fakerPkg['faker' + data.fakerLocale];
  if (!fakerInstance) {
    throw new Error(`No faker instance "faker${data.fakerLocale}" for locale file ${file}`);
  }
  data._faker = fakerInstance;
  locales.set(data.code, data);
}

export function listLocales() {
  return Array.from(locales.values()).map(({ code, label }) => ({ code, label }));
}

export function getLocale(code) {
  const loc = locales.get(code);
  if (loc) return loc;
  // Fall back to the first registered locale rather than throwing, so a stale/unknown
  // code in a shared link still renders something instead of a hard error.
  return locales.values().next().value;
}
