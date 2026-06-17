/** A token is just `${region}.${recordSeedDecimalString}` — not a secret, just a compact
 *  way for the client to reference "this exact record" without re-deriving seeds itself. */
export function encodeToken(region, recordSeedBig) {
  return `${region}.${recordSeedBig.toString()}`;
}

export function decodeToken(token) {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) throw new Error('Malformed token');
  const region = token.slice(0, dotIndex);
  const recordSeedBig = BigInt(token.slice(dotIndex + 1));
  return { region, recordSeedBig };
}