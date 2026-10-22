// The little crypto PKCE needs: random bytes, SHA-256 and base64url.
//
// SHA-256 is plain JavaScript so every runtime takes the same path. WebCrypto
// is async and missing on Hermes, and hashing a 43-character verifier is
// trivial. Random bytes can't be faked safely, so those come from the
// platform: WebCrypto's getRandomValues when present (browsers, Node 20+,
// Hermes with expo-crypto or react-native-get-random-values installed), or a
// source the app passes in.

/** A secure random source. `crypto` in browsers and Node, or expo-crypto's module, fits as is. */
export interface RandomSource {
  getRandomValues<T extends Uint8Array>(bytes: T): T;
}

/** Finds the platform's secure random source, or throws saying how to provide one. */
export function defaultRandomSource(): RandomSource {
  // Feature-detected, never assumed: React Native has no crypto global unless
  // a polyfill is installed.
  const platform = (globalThis as { crypto?: Partial<RandomSource> }).crypto;

  if (platform && typeof platform.getRandomValues === "function") {
    return platform as RandomSource;
  }

  throw new TypeError(
    "OAuth needs a secure random source, and this runtime has no getRandomValues. " +
      "On React Native, install react-native-get-random-values (or pass expo-crypto as the `random` option).",
  );
}

export function randomBytes(source: RandomSource, length: number): Uint8Array {
  return source.getRandomValues(new Uint8Array(length));
}

/** A random string, base64url-encoded: verifiers, state and nonces. */
export function randomToken(source: RandomSource, byteLength: number): string {
  return base64url(randomBytes(source, byteLength));
}

/** The PKCE S256 challenge for a verifier (RFC 7636 §4.2). */
export function codeChallenge(verifier: string): string {
  return base64url(sha256(ascii(verifier)));
}

// Verifiers, state and nonces are base64url, so plain ASCII. This avoids
// TextEncoder, which older Hermes versions lack.
function ascii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) throw new TypeError("Expected an ASCII string");
    bytes[i] = code;
  }

  return bytes;
}

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Base64url without padding (RFC 4648 §5). */
export function base64url(bytes: Uint8Array): string {
  let out = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];

    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 0x03) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += BASE64URL[((b & 0x0f) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += BASE64URL[c & 0x3f];
  }

  return out;
}

// SHA-256 round constants (FIPS 180-4 §4.2.2).
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-256 of `data` (FIPS 180-4). */
export function sha256(data: Uint8Array): Uint8Array {
  // Pad: a 1 bit, zeros, then the length in bits as a 64-bit big-endian number,
  // to a multiple of 64 bytes.
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  const bits = data.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bits / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bits >>> 0);

  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array<number>(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    // The message schedule.
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4);

    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15]!, 7) ^ rotr(w[t - 15]!, 18) ^ (w[t - 15]! >>> 3);
      const s1 = rotr(w[t - 2]!, 17) ^ rotr(w[t - 2]!, 19) ^ (w[t - 2]! >>> 10);
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) | 0;
    }

    // The 64 rounds.
    let [a, b, c, d, e, f, g, h] = hash as [number, number, number, number, number, number, number, number];

    for (let t = 0; t < 64; t++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choose + K[t]! + w[t]!) | 0;

      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0]! + a) | 0;
    hash[1] = (hash[1]! + b) | 0;
    hash[2] = (hash[2]! + c) | 0;
    hash[3] = (hash[3]! + d) | 0;
    hash[4] = (hash[4]! + e) | 0;
    hash[5] = (hash[5]! + f) | 0;
    hash[6] = (hash[6]! + g) | 0;
    hash[7] = (hash[7]! + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  hash.forEach((word, i) => outView.setUint32(i * 4, word >>> 0));

  return out;
}
