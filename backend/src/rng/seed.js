// Deterministic seeding core.
//
// Design (see README for the full rationale):
//   1. The user-facing seed is a 64-bit integer (string of digits, accepted as BigInt).
//   2. combinePageSeed(seed, pageNumber) mixes the seed with the page/batch number using a
//      simple multiply-add-and-mask (MAD) operation, as suggested by the assignment.
//   3. combineRecordSeed(pageSeed, indexInPage) mixes that further down to one 64-bit seed
//      per record (per song).
//   4. From a record seed, deriveStream(recordSeed, label) hashes in a label string
//      ("content" | "likes" | "review" | "cover" | "music") via splitmix64 to produce a
//      *fully independent* 32-bit stream for that concern. Because each stream is derived
//      directly from the label hash (not by sequentially consuming a shared generator),
//      drawing more or fewer random numbers from the "likes" stream can never shift what
//      the "content" stream produces. That's the same trick the assignment's C# hint
//      demonstrates (seeding one generator from another so changing how many reviews you
//      draw doesn't change the songs) — implemented with hashed labels instead of nested
//      sequential generators, which makes every concern independent of every other one,
//      not just of the ones that happen to come "after" it.
//
// Everything here is pure and side-effect free: same inputs -> same outputs, forever.

const MASK64 = (1n << 64n) - 1n;
const MASK32 = 0xffffffffn;

// Classic 64-bit LCG multiplier/increment (Knuth's MMIX constants) — "a simple MAD operation".
const LCG_MUL = 6364136223846793005n;
const LCG_INC = 1442695040888963407n;

function toBigIntSeed(input) {
  if (typeof input === 'bigint') return input & MASK64;
  if (typeof input === 'number') return BigInt(Math.trunc(input)) & MASK64;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return 0n;
    try {
      // Accept decimal or 0x-prefixed hex strings.
      const big = trimmed.toLowerCase().startsWith('0x') ? BigInt(trimmed) : BigInt(trimmed);
      return big & MASK64;
    } catch {
      // Non-numeric seed text (e.g. a pasted phrase): hash it into 64 bits deterministically.
      let h = 1469598103934665603n; // FNV offset basis
      for (let i = 0; i < trimmed.length; i++) {
        h ^= BigInt(trimmed.charCodeAt(i));
        h = (h * 1099511628211n) & MASK64;
      }
      return h;
    }
  }
  return 0n;
}

function randomSeed64() {
  // crypto-free; only used to *suggest* a seed value to the user, who can edit it.
  const hi = BigInt(Math.floor(Math.random() * 0xffffffff));
  const lo = BigInt(Math.floor(Math.random() * 0xffffffff));
  return ((hi << 32n) | lo) & MASK64;
}

/** MAD: combine a 64-bit seed with an integer page number into a new 64-bit seed. */
function combinePageSeed(seedBig, pageNumber) {
  const p = BigInt(Math.trunc(pageNumber));
  return (seedBig * LCG_MUL + p * LCG_INC + 1n) & MASK64;
}

/** MAD: combine a page seed with a record's position within the page. */
function combineRecordSeed(pageSeedBig, indexInPage) {
  const i = BigInt(Math.trunc(indexInPage));
  return (pageSeedBig * LCG_MUL + i * LCG_INC + 0x9e3779b97f4a7c15n) & MASK64;
}

function hashLabel(label) {
  let h = 1469598103934665603n;
  for (let i = 0; i < label.length; i++) {
    h ^= BigInt(label.charCodeAt(i));
    h = (h * 1099511628211n) & MASK64;
  }
  return h;
}

/** splitmix64 finalizer — good avalanche, used to derive independent streams. */
function splitmix64(seed) {
  let z = (seed + 0x9e3779b97f4a7c15n) & MASK64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  z = z ^ (z >> 31n);
  return z & MASK64;
}

/**
 * Derive a fully independent 32-bit integer stream seed for `label` from a record seed.
 * Independent labels never observe each other's draws.
 */
function deriveSeed32(recordSeedBig, label) {
  const mixed = splitmix64(recordSeedBig ^ hashLabel(label));
  return Number(mixed & MASK32);
}

/** mulberry32: small, fast, good-enough PRNG returning floats in [0, 1). */
function mulberry32(a) {
  let state = a >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a ready-to-use rng() function (float in [0,1)) for a given record seed + label. */
function makeStream(recordSeedBig, label) {
  return mulberry32(deriveSeed32(recordSeedBig, label));
}

// --- small helpers built on top of a [0,1) generator ---

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function chance(rng, probability) {
  return rng() < probability;
}

function intBetween(rng, min, max) {
  // inclusive
  return min + Math.floor(rng() * (max - min + 1));
}

/** Faker-friendly 32-bit seed pair derived from a record seed (faker.seed accepts an array). */
function fakerSeedFor(recordSeedBig, label) {
  const mixed = splitmix64(recordSeedBig ^ hashLabel(label));
  const hi = Number((mixed >> 32n) & MASK32);
  const lo = Number(mixed & MASK32);
  return [hi, lo];
}

export {
  toBigIntSeed,
  randomSeed64,
  combinePageSeed,
  combineRecordSeed,
  deriveSeed32,
  makeStream,
  fakerSeedFor,
  pick,
  chance,
  intBetween,
  MASK64,
};
