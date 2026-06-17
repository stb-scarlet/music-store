import { makeStream, fakerSeedFor, pick, chance } from '../rng/seed.js';
import { fillTemplate } from './template.js';

/**
 * Generate the core text content for one song. Depends only on (locale, recordSeed) —
 * never on the likes setting, review count, etc. — so changing those never perturbs
 * titles/artists/albums/genres (see rng/seed.js for why the streams can't interfere).
 */
export function generateSongContent(locale, recordSeedBig) {
  const faker = locale._faker;
  faker.seed(fakerSeedFor(recordSeedBig, 'content:faker'));
  const rng = makeStream(recordSeedBig, 'content:choices');

  const isSolo = chance(rng, locale.soloArtistProbability);
  const artist = isSolo
    ? faker.person.fullName()
    : fillTemplate(pick(rng, locale.bandTemplates), locale, rng, faker);

  const title = fillTemplate(pick(rng, locale.songTemplates), locale, rng, faker);

  const isSingle = chance(rng, locale.singleProbability);
  const album = isSingle ? 'Single' : fillTemplate(pick(rng, locale.albumTemplates), locale, rng, faker);

  const genre = pick(rng, locale.genres);

  return { title, artist, album, genre, isSingle };
}

/** Probabilistic likes count achieving the requested fractional average exactly in expectation. */
export function generateLikes(recordSeedBig, averageLikes) {
  const rng = makeStream(recordSeedBig, 'likes');
  const avg = Math.max(0, Math.min(10, averageLikes));
  if (avg === 0) return 0;
  const lower = Math.floor(avg);
  const upper = Math.ceil(avg);
  if (lower === upper) return lower;
  const fractional = avg - lower; // probability of rounding up
  return chance(rng, fractional) ? upper : lower;
}

export function generateReviews(locale, recordSeedBig) {
  const rng = makeStream(recordSeedBig, 'reviews');
  const count = 1 + Math.floor(rng() * 3); // 1-3 reviews
  const reviews = [];
  for (let i = 0; i < count; i++) {
    const sentenceCount = 1 + Math.floor(rng() * 2); // 1-2 sentences
    const sentences = [];
    for (let s = 0; s < sentenceCount; s++) {
      sentences.push(fillTemplate(pick(rng, locale.reviewTemplates), locale, rng, locale._faker));
    }
    reviews.push(sentences.join(' '));
  }
  return reviews;
}

export function generateLabelAndYear(recordSeedBig) {
  const rng = makeStream(recordSeedBig, 'label-year');

  const labels = [
    'Aurora Records',
    'Neon Wave Studios',
    'SilverTone Music',
    'Blue Horizon Label',
    'Echo Park Records'
  ];

  const label = labels[Math.floor(rng() * labels.length)];
  const year = 1975 + Math.floor(rng() * 45);

  return { label, year };
}