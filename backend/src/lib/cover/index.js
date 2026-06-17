import sharp from 'sharp';
import { makeStream, deriveSeed32 } from '../../rng/seed.js';
import { buildBackgroundSvg } from '../coverGenerator.js';
import { buildTextOverlaySvg, catalogCode } from './textOverlay.js';
import { fetchAiCoverImage, fetchStockPhoto, pickStockFilter } from './sources.js';

const MAX_CACHE_ENTRIES = 400;
const cache = new Map();

async function applyStockFilter(buffer, filter) {
  let img = sharp(buffer);
  switch (filter.kind) {
    case 'duotone':
      return img.grayscale().tint(filter.color).toBuffer();
    case 'hueShift':
      return img.modulate({ hue: filter.degrees, saturation: filter.saturation }).toBuffer();
    case 'warmTint':
    case 'coolTint':
      return img.tint(filter.color).modulate({ brightness: filter.brightness }).toBuffer();
    case 'highContrastMono':
      return img.grayscale().linear(1.35, -28).toBuffer();
    default:
      return img.toBuffer();
  }
}

/**
 * Get the final composited cover image for a record (JPEG buffer).
 *
 * Tiered strategy (see README for rationale):
 *   1. AI-generated artwork from a mood/scene prompt (image.pollinations.ai, no API key).
 *   2. A real seeded stock photo (picsum.photos) with a randomized filter.
 *   3. The procedural generative-art background (fully offline, no network needed).
 * Real title/artist text + catalog code is composited on top server-side in every case,
 * so typography is always crisp regardless of which tier produced the artwork.
 *
 * `process.env.COVER_MODE` can force a single tier ('ai' | 'stock' | 'procedural') for
 * testing or for fully offline environments; default is 'auto' (try them in order).
 */
export async function getCoverImage(recordSeedBig, content, { size = 640 } = {}) {
  const cacheKey = `${recordSeedBig.toString()}:${size}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const mode = process.env.COVER_MODE || 'auto';
  const seedNum = deriveSeed32(recordSeedBig, 'cover:external');

  let baseBuffer = null;
  let source = null;

  if (mode === 'ai' || mode === 'auto') {
    const promptRng = makeStream(recordSeedBig, 'cover:prompt');
    baseBuffer = await fetchAiCoverImage(promptRng, seedNum, size);
    if (baseBuffer) source = 'ai';
  }

  if (!baseBuffer && (mode === 'stock' || mode === 'auto')) {
    const stockBuffer = await fetchStockPhoto(seedNum, size);
    if (stockBuffer) {
      try {
        const filterRng = makeStream(recordSeedBig, 'cover:filter');
        const filter = pickStockFilter(filterRng);
        baseBuffer = await applyStockFilter(stockBuffer, filter);
        source = 'stock';
      } catch {
        baseBuffer = null;
      }
    }
  }

  if (!baseBuffer) {
    const svg = buildBackgroundSvg(recordSeedBig);
    baseBuffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    source = 'procedural';
  }

  const overlaySvg = buildTextOverlaySvg(size, content, catalogCode(recordSeedBig));
  const resizedBase = await sharp(baseBuffer).resize(size, size, { fit: 'cover' }).toBuffer();
  const finalBuffer = await sharp(resizedBase)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();

  const result = { buffer: finalBuffer, contentType: 'image/jpeg', source };
  cache.set(cacheKey, result);
  if (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  return result;
}