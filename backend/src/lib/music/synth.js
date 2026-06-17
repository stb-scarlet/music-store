// Renders composed note events (see music/compose.js) into a single mono Float32Array of
// PCM samples. Each instrument gets its own oscillator + ADSR envelope; everything reads
// from a seeded RNG so the same composition always renders to the same waveform (the
// "static" in the hi-hat/noise layer must be deterministic too, not Math.random()).

const SAMPLE_RATE = 44100;

function oscillator(type, phase) {
  const twoPi = Math.PI * 2;
  const p = phase % 1;
  switch (type) {
    case 'sine':
      return Math.sin(p * twoPi);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'triangle':
      return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
    case 'sawtooth':
      return 2 * (p - Math.floor(p + 0.5));
    default:
      return Math.sin(p * twoPi);
  }
}

function envelope(t, durationSec, attack, decay, sustainLevel, release) {
  if (t < attack) return t / attack;
  if (t < attack + decay) {
    const d = (t - attack) / decay;
    return 1 - d * (1 - sustainLevel);
  }
  const releaseStart = durationSec - release;
  if (t < releaseStart) return sustainLevel;
  if (t < durationSec) {
    const r = (t - releaseStart) / release;
    return sustainLevel * (1 - r);
  }
  return 0;
}

function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/** A small deterministic PRNG-backed white-noise generator for percussion. */
function makeNoiseSource(rng) {
  return () => rng() * 2 - 1;
}

function renderTonalTrack(buffer, events, waveform, beatToSec, gain, opts = {}) {
  const detune = opts.detune || 0; // semitone offset for a second, quieter detuned voice (richness)
  for (const ev of events) {
    const startSec = beatToSec(ev.startBeat);
    const durSec = beatToSec(ev.startBeat + ev.durationBeats) - startSec;
    const startSample = Math.floor(startSec * SAMPLE_RATE);
    const totalSamples = Math.max(1, Math.floor(durSec * SAMPLE_RATE));
    const freq = midiToFreq(ev.midiNote);
    const freq2 = detune ? midiToFreq(ev.midiNote + detune) : null;
    const attack = Math.min(0.015, durSec * 0.2);
    const release = Math.min(0.12, durSec * 0.4);
    const decay = Math.min(0.08, durSec * 0.3);
    const sustain = 0.7;
    for (let i = 0; i < totalSamples; i++) {
      const idx = startSample + i;
      if (idx >= buffer.length) break;
      const t = i / SAMPLE_RATE;
      const env = envelope(t, durSec, attack, decay, sustain, release);
      let sample = oscillator(waveform, (t * freq) / 1) * 0.85;
      if (freq2) sample += oscillator(waveform, t * freq2) * 0.3;
      buffer[idx] += sample * env * ev.velocity * gain;
    }
  }
}

function renderKick(buffer, events, beatToSec, gain) {
  for (const ev of events) {
    const startSec = beatToSec(ev.startBeat);
    const durSec = 0.22;
    const startSample = Math.floor(startSec * SAMPLE_RATE);
    const totalSamples = Math.floor(durSec * SAMPLE_RATE);
    let phase = 0;
    for (let i = 0; i < totalSamples; i++) {
      const idx = startSample + i;
      if (idx >= buffer.length) break;
      const t = i / SAMPLE_RATE;
      const freq = 40 + 150 * Math.pow(2, -t * 14); // pitch drop with a floor so it stays audible, no subsonic artifacts
      phase += freq / SAMPLE_RATE; // integrate frequency properly -> no FM aliasing
      const env = Math.exp(-t * 14);
      buffer[idx] += Math.sin(2 * Math.PI * phase) * env * ev.velocity * gain;
    }
  }
}

function renderHat(buffer, events, beatToSec, gain, noiseSource) {
  for (const ev of events) {
    const startSec = beatToSec(ev.startBeat);
    const durSec = 0.05;
    const startSample = Math.floor(startSec * SAMPLE_RATE);
    const totalSamples = Math.floor(durSec * SAMPLE_RATE);
    let prev = 0;
    for (let i = 0; i < totalSamples; i++) {
      const idx = startSample + i;
      if (idx >= buffer.length) break;
      const t = i / SAMPLE_RATE;
      const raw = noiseSource();
      const highPassed = raw - prev; // crude difference filter: kills DC/low rumble, keeps it "tsst" not "thud"
      prev = raw;
      const env = Math.exp(-t * 95);
      buffer[idx] += highPassed * 0.45 * env * ev.velocity * gain;
    }
  }
}

/**
 * Render a composed song (see compose.js) to a mono Float32Array of PCM samples in [-1, 1].
 * `noiseRng` drives all percussion noise deterministically.
 */
export function renderComposition(composition, noiseRng) {
  const { tempoBpm, tracks, waveforms, totalBeats } = composition;
  const beatToSec = (beat) => (beat * 60) / tempoBpm;
  const totalSec = beatToSec(totalBeats) + 1.0; // tail for the last note's release
  const totalSamples = Math.ceil(totalSec * SAMPLE_RATE);
  const buffer = new Float32Array(totalSamples);

  const noiseSource = makeNoiseSource(noiseRng);

  renderTonalTrack(buffer, tracks.chords, waveforms.chords, beatToSec, 0.5);
  renderTonalTrack(buffer, tracks.bass, waveforms.bass, beatToSec, 0.9);
  renderTonalTrack(buffer, tracks.lead, waveforms.lead, beatToSec, 0.8, { detune: 0.08 });
  renderKick(buffer, tracks.kick, beatToSec, 1.0);
  renderHat(buffer, tracks.hat, beatToSec, 0.4, noiseSource);

  return { buffer, sampleRate: SAMPLE_RATE };
}

export { SAMPLE_RATE };