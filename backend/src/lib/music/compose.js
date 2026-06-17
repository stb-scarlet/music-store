import { SCALES, PROGRESSIONS, degreeToSemitone, triadDegrees } from './theory.js';
import { intBetween, chance } from '../../rng/seed.js';

const STRUCTURE_PATTERNS = [
  ['verse', 'chorus', 'verse'],
  ['verse', 'verse', 'chorus'],
  ['verse', 'chorus', 'chorus'],
  ['verse', 'chorus', 'verse', 'chorus'],
];

// 8 eighth-note slots per bar. 1 = note may sound, 0 = rest.
const RHYTHM_PATTERNS = [
  [1, 0, 1, 1, 0, 1, 0, 1],
  [1, 1, 0, 1, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 1, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 1, 1, 0, 1, 0],
];

const STEP_TABLE = [-3, -2, -1, 0, 1, 2, 3];
const STEP_WEIGHTS = [0.04, 0.13, 0.28, 0.1, 0.28, 0.13, 0.04];

function weightedStep(rng) {
  let r = rng();
  for (let i = 0; i < STEP_TABLE.length; i++) {
    r -= STEP_WEIGHTS[i];
    if (r <= 0) return STEP_TABLE[i];
  }
  return 0;
}

function nearestChordTone(current, chordBases) {
  let best = chordBases[0];
  let bestDist = Infinity;
  for (const base of chordBases) {
    const octaveShift = Math.round((current - base) / 7) * 7;
    const candidate = base + octaveShift;
    const dist = Math.abs(candidate - current);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Compose a short song. Returns tempo/key info plus per-instrument note events expressed
 * in beats (tempo-agnostic — the renderer converts beats to seconds).
 */
export function composeSong(rng) {
  const tempoBpm = intBetween(rng, 78, 150);
  const scaleNames = Object.keys(SCALES);
  const scaleName = scaleNames[Math.floor(rng() * scaleNames.length)];
  const scaleArr = SCALES[scaleName];
  const tonicMidi = intBetween(rng, 55, 66);

  let verseProg = PROGRESSIONS[Math.floor(rng() * PROGRESSIONS.length)];
  let chorusProg = PROGRESSIONS[Math.floor(rng() * PROGRESSIONS.length)];
  if (chorusProg === verseProg) {
    chorusProg = PROGRESSIONS[Math.floor(rng() * PROGRESSIONS.length)];
  }

  const structure = STRUCTURE_PATTERNS[Math.floor(rng() * STRUCTURE_PATTERNS.length)];
  const rhythm = RHYTHM_PATTERNS[Math.floor(rng() * RHYTHM_PATTERNS.length)];

  const waveforms = {
    bass: chance(rng, 0.5) ? 'sine' : 'triangle',
    chords: chance(rng, 0.5) ? 'triangle' : 'sine',
    lead: ['sawtooth', 'square', 'triangle'][Math.floor(rng() * 3)],
  };

  const tracks = { bass: [], chords: [], lead: [], kick: [], hat: [] };

  let beatPos = 0;
  let melodyDegree = triadDegrees(verseProg[0])[0] + 7; // start an octave above the tonic root
  const melodyCenter = melodyDegree;

  for (const sectionName of structure) {
    const isChorus = sectionName === 'chorus';
    const prog = isChorus ? chorusProg : verseProg;
    const dynamicBoost = isChorus ? 0.18 : 0;

    for (const degree of prog) {
      const triad = triadDegrees(degree);
      const chordMidiNotes = triad.map((d) => tonicMidi + degreeToSemitone(scaleArr, d));

      // Sustained pad chord for the whole bar.
      for (const note of chordMidiNotes) {
        tracks.chords.push({
          startBeat: beatPos,
          durationBeats: 3.7,
          midiNote: note,
          velocity: 0.13 + dynamicBoost * 0.4,
        });
      }

      // Bass: root on beat 1, root-or-fifth on beat 3.
      const bassRoot = tonicMidi - 12 + degreeToSemitone(scaleArr, degree);
      const bassFifth = tonicMidi - 12 + degreeToSemitone(scaleArr, degree + 4);
      tracks.bass.push({ startBeat: beatPos, durationBeats: 0.45, midiNote: bassRoot, velocity: 0.55 + dynamicBoost * 0.3 });
      tracks.bass.push({
        startBeat: beatPos + 2,
        durationBeats: 0.45,
        midiNote: chance(rng, 0.6) ? bassFifth : bassRoot,
        velocity: 0.5 + dynamicBoost * 0.3,
      });

      // Kick on beats 1 and 3, hats on the eighth grid with a little human skip.
      tracks.kick.push({ startBeat: beatPos, durationBeats: 0.2, midiNote: 36, velocity: 0.9 });
      tracks.kick.push({ startBeat: beatPos + 2, durationBeats: 0.2, midiNote: 36, velocity: 0.8 });
      for (let s = 0; s < 8; s++) {
        if (!chance(rng, 0.86)) continue;
        tracks.hat.push({
          startBeat: beatPos + s * 0.5,
          durationBeats: 0.12,
          midiNote: 42,
          velocity: s % 2 === 0 ? 0.22 : 0.13,
        });
      }

      // Lead melody: chord-tone anchored on strong beats, stepwise random walk elsewhere.
      const chordBases = triad;
      for (let s = 0; s < 8; s++) {
        if (!rhythm[s]) continue;
        if (s === 0) {
          melodyDegree = nearestChordTone(melodyDegree, chordBases);
        } else {
          melodyDegree += weightedStep(rng);
          if (s === 4 && chance(rng, 0.5)) {
            melodyDegree = nearestChordTone(melodyDegree, chordBases);
          }
          melodyDegree = clamp(melodyDegree, melodyCenter - 8, melodyCenter + 8);
        }
        const midiNote = tonicMidi + degreeToSemitone(scaleArr, melodyDegree);
        tracks.lead.push({
          startBeat: beatPos + s * 0.5,
          durationBeats: 0.42,
          midiNote,
          velocity: 0.55 + dynamicBoost * 0.3 + rng() * 0.15,
        });
      }

      beatPos += 4;
    }
  }

  return { tempoBpm, scaleName, tonicMidi, totalBeats: beatPos, waveforms, tracks, structure };
}
