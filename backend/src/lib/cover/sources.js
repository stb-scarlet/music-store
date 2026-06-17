import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pick, intBetween } from '../../rng/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptVocab = JSON.parse(readFileSync(path.join(__dirname, 'promptVocab.json'), 'utf-8'));

const AI_IMAGE_BASE = process.env.AI_IMAGE_BASE_URL || 'https://image.pollinations.ai/prompt';
const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || 'flux';
const AI_IMAGE_TIMEOUT_MS = Number(process.env.AI_IMAGE_TIMEOUT_MS || 15000);
const STOCK_IMAGE_BASE = process.env.STOCK_IMAGE_BASE_URL || 'https://picsum.photos/seed';
const STOCK_IMAGE_TIMEOUT_MS = Number(process.env.STOCK_IMAGE_TIMEOUT_MS || 8000);

/** Build an English image-generation prompt. Independent of UI locale (it's an instruction
 *  to the image model, never shown to the user — the real localized title/artist text is
 *  composited on top afterwards). */
export function buildCoverPrompt(rng) {
  const mood = pick(rng, promptVocab.moodAdjectives);
  const scene = pick(rng, promptVocab.sceneNouns);
  const style = pick(rng, promptVocab.styleDescriptors);
  return `album cover art, ${style}, ${mood} ${scene}, no text, no words, no letters, no logo, high detail`;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Tier 1: fully AI-generated artwork from a prompt derived from the song's mood/genre. */
export async function fetchAiCoverImage(rng, seedNum, size) {
  const prompt = buildCoverPrompt(rng);
  const url = `${AI_IMAGE_BASE}/${encodeURIComponent(prompt)}?width=${size}&height=${size}&seed=${seedNum}&model=${AI_IMAGE_MODEL}&nologo=true`;
  return fetchWithTimeout(url, AI_IMAGE_TIMEOUT_MS);
}

/** Tier 2: a real seeded stock photo (reproducible) with a randomized filter applied. */
export async function fetchStockPhoto(seedNum, size) {
  const url = `${STOCK_IMAGE_BASE}/${seedNum}/${size}/${size}`;
  return fetchWithTimeout(url, STOCK_IMAGE_TIMEOUT_MS);
}

/** Pick a randomized but deterministic filter recipe for sharp to apply to a stock photo. */
export function pickStockFilter(rng) {
  const kind = pick(rng, ['duotone', 'hueShift', 'warmTint', 'coolTint', 'highContrastMono']);
  switch (kind) {
    case 'duotone':
      return { kind, color: pick(rng, [{ r: 224, g: 164, b: 88 }, { r: 106, g: 76, b: 147 }, { r: 95, g: 168, b: 160 }, { r: 233, g: 138, b: 21 }]) };
    case 'hueShift':
      return { kind, degrees: intBetween(rng, -160, 160), saturation: 1 + rng() * 0.6 };
    case 'warmTint':
      return { kind, color: { r: 255, g: 200, b: 140 }, brightness: 0.95 + rng() * 0.15 };
    case 'coolTint':
      return { kind, color: { r: 150, g: 190, b: 255 }, brightness: 0.95 + rng() * 0.15 };
    case 'highContrastMono':
      return { kind };
    default:
      return { kind: 'hueShift', degrees: 0, saturation: 1 };
  }
}