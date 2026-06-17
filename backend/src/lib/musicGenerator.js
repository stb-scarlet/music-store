import { makeStream } from '../rng/seed.js';
import { composeSong } from './music/compose.js';
import { renderComposition } from './music/synth.js';
import { applyEffects } from './music/effects.js';
import { encodeWav } from './music/wav.js';

const MAX_CACHE_ENTRIES = 200;
const cache = new Map();

/** Build the full WAV audio buffer for one song, deterministic in `recordSeedBig`. Cached
 *  in memory since rendering involves real DSP work and the same record is often re-requested
 *  (replay, revisiting a page/card). */
export function generateSongAudio(recordSeedBig) {
  const cacheKey = recordSeedBig.toString();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const composeRng = makeStream(recordSeedBig, 'music:compose');
  const noiseRng = makeStream(recordSeedBig, 'music:noise');
  const fxRng = makeStream(recordSeedBig, 'music:fx');

  const composition = composeSong(composeRng);
  const { buffer, sampleRate } = renderComposition(composition, noiseRng);
  const processed = applyEffects(buffer, sampleRate, fxRng);
  const wav = encodeWav(processed, sampleRate);

  const result = { wav, composition };
  cache.set(cacheKey, result);
  if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  return result;
}

/** Just the composition (cheap — no DSP), for the detail/lyrics endpoint which doesn't need
 *  the rendered audio bytes, only the structure/tempo. */
export function composeForRecord(recordSeedBig) {
  const composeRng = makeStream(recordSeedBig, 'music:compose');
  return composeSong(composeRng);
}