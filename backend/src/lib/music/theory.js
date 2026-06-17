// Small music-theory toolkit: scales as semitone offsets, diatonic triads built from a
// scale, and a bank of common chord-progression shapes (expressed as scale-degree
// sequences, 0-indexed: 0=I, 1=ii, 2=iii, 3=IV, 4=V, 5=vi, 6=vii).

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export const PROGRESSIONS = [
  [0, 3, 4, 3], // I IV V IV
  [0, 5, 3, 4], // I vi IV V
  [1, 4, 0, 0], // ii V I I
  [0, 4, 5, 3], // I V vi IV
  [5, 3, 0, 4], // vi IV I V
  [0, 2, 3, 4], // I iii IV V
  [0, 4, 1, 4], // I V ii V
  [5, 0, 3, 4], // vi I IV V
];

/** Map a scale degree (can be negative or >6, octave-extended) to a semitone offset from tonic. */
export function degreeToSemitone(scaleArr, degree) {
  const len = scaleArr.length;
  const octave = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return scaleArr[idx] + 12 * octave;
}

/** Build a triad (root, third, fifth) of scale-degree offsets for a chord rooted at `degree`. */
export function triadDegrees(degree) {
  return [degree, degree + 2, degree + 4];
}

export function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
