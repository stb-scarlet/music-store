import { makeStream, pick } from '../rng/seed.js';
import { fillTemplate } from './template.js';
const LINES_PER_SECTION = 2;

/** Generate lyric lines with playback timestamps (seconds), aligned to verse/chorus sections. */
export function generateLyrics(locale, recordSeedBig, composition) {
  const rng = makeStream(recordSeedBig, 'lyrics');
  const beatToSec = (beat) => (beat * 60) / composition.tempoBpm;

  const lines = [];
  let beatPos = 0;

  const sections = composition.structure;
  const beatsPerSection = composition.totalBeats / sections.length;

  for (const sectionName of sections) {
    for (let i = 0; i < LINES_PER_SECTION; i++) {
      const startBeat = beatPos + (i * beatsPerSection) / LINES_PER_SECTION;
      const text = fillTemplate(pick(rng, locale.lyricTemplates), locale, rng, locale._faker);
      lines.push({ time: Number(beatToSec(startBeat).toFixed(2)), text, section: sectionName });
    }
    beatPos += beatsPerSection;
  }
  return lines;
}