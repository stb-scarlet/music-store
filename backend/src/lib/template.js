// Fills `{Token}` placeholders in a locale template string using that locale's lookup
// tables. The placeholder's casing decides whether the picked word is capitalized, so a
// single template string can mix "{Adj} {noun}" style slots.
//
// Supported tokens (case-insensitive lookup, case-sensitive capitalization):
//   Adj / AdjPl   -> locale.adjectives / adjectivesPlural
//   Noun / NounPl -> locale.nouns / nounsPlural
//   Verbing       -> locale.verbsGerund
//   City          -> faker.location.city() for the locale's own faker instance

import { pick } from '../rng/seed.js';

function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const TOKEN_SOURCES = {
  adj: (locale) => locale.adjectives,
  adjpl: (locale) => locale.adjectivesPlural,
  noun: (locale) => locale.nouns,
  nounpl: (locale) => locale.nounsPlural,
  verbing: (locale) => locale.verbsGerund,
};

export function fillTemplate(template, locale, rng, faker) {
  return template.replace(/\{(\w+)\}/g, (_match, token) => {
    const key = token.toLowerCase();
    const isCapitalized = token[0] === token[0].toUpperCase() && /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]/.test(token[0]);

    if (key === 'city') {
      const city = faker.location.city();
      return isCapitalized ? city : city.toLowerCase();
    }

    const source = TOKEN_SOURCES[key];
    if (!source) return _match; // unknown token: leave it untouched rather than guessing
    const word = pick(rng, source(locale));
    return isCapitalized ? capitalize(word) : word;
  });
}
