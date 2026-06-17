// Simple, dependency-free DSP effects applied after mixing all tracks together.

function feedbackDelay(input, sampleRate, delaySec, feedback, mix) {
  const delaySamples = Math.max(1, Math.floor(delaySec * sampleRate));
  const wet = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const delayed = i >= delaySamples ? wet[i - delaySamples] : 0;
    wet[i] = input[i] + delayed * feedback;
  }
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] * (1 - mix) + wet[i] * mix;
  return out;
}

/** A diffuse multi-tap echo bank standing in for a convolution reverb (no IR file needed). */
function simpleReverb(input, sampleRate, mix) {
  const tapTimes = [0.013, 0.021, 0.029, 0.037, 0.043];
  const tapFeedback = [0.35, 0.3, 0.25, 0.22, 0.18];
  const wet = new Float32Array(input.length);
  for (let t = 0; t < tapTimes.length; t++) {
    const delaySamples = Math.floor(tapTimes[t] * sampleRate);
    const fb = tapFeedback[t];
    const tapWet = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const delayed = i >= delaySamples ? tapWet[i - delaySamples] : 0;
      tapWet[i] = input[i] + delayed * fb;
    }
    for (let i = 0; i < input.length; i++) wet[i] += tapWet[i] / tapTimes.length;
  }
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] * (1 - mix) + wet[i] * mix;
  return out;
}

function normalizeAndLimit(input, targetPeak = 0.92) {
  let peak = 0;
  for (let i = 0; i < input.length; i++) {
    const a = Math.abs(input[i]);
    if (a > peak) peak = a;
  }
  const gain = peak > 0 ? targetPeak / peak : 1;
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = Math.tanh(input[i] * gain);
  return out;
}

/** Apply echo + reverb (parameters drawn from `rng` so they vary song to song) and limit. */
export function applyEffects(buffer, sampleRate, rng) {
  const delaySec = 0.18 + rng() * 0.22;
  const delayFeedback = 0.22 + rng() * 0.18;
  const delayMix = 0.14 + rng() * 0.14;
  const reverbMix = 0.1 + rng() * 0.12;

  let out = feedbackDelay(buffer, sampleRate, delaySec, delayFeedback, delayMix);
  out = simpleReverb(out, sampleRate, reverbMix);
  out = normalizeAndLimit(out);
  return out;
}