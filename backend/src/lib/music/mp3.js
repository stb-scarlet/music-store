import * as lamejsMod from '@breezystack/lamejs';

const Mp3Encoder = lamejsMod.Mp3Encoder || lamejsMod.default.Mp3Encoder;

/** Encode a 16-bit mono PCM WAV buffer (as produced by music/wav.js) into an MP3 buffer. */
export function wavToMp3(wavBuffer, { bitrateKbps = 128 } = {}) {
  const sampleRate = wavBuffer.readUInt32LE(24);
  const dataStart = 44;
  const numSamples = (wavBuffer.length - dataStart) / 2;
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) samples[i] = wavBuffer.readInt16LE(dataStart + i * 2);

  const encoder = new Mp3Encoder(1, sampleRate, bitrateKbps);
  const blockSize = 1152;
  const chunks = [];
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) chunks.push(Buffer.from(mp3buf));
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}