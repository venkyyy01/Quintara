/**
 * Deterministic seeded PRNG for the authoritative engine.
 *
 * Rule reference: Rules Contract §20 (SHUFFLING):
 *  - Never call Math.random() inside authoritative production game logic.
 *  - Use a deterministic seeded PRNG after generating a secure seed.
 *  - Persist rngAlgorithmVersion + rngSeed for exact replay reproduction.
 *
 * Implementation: xorshift128 over four uint32 words, with unbiased bounded
 * integer sampling via rejection. Integer-only arithmetic (§149).
 */

export const RNG_ALGORITHM_VERSION = "xorshift128-v1";

export interface RngState {
  readonly s0: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
}

const UINT32 = 4294967296;

/**
 * Derives a deterministic four-word state from a seed string.
 * The same seed always yields the same stream.
 */
export function createRngState(seed: string): RngState {
  let h1 = 0x9e3779b9 ^ seed.length;
  let h2 = 0x85ebca6b;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 + c, 0x85ebca6b) ^ (h2 >>> 13)) >>> 0;
  }
  let s0 = h1 >>> 0;
  let s1 = h2 >>> 0;
  let s2 = (h1 ^ h2 ^ 0x27d4eb2d) >>> 0;
  let s3 = (Math.imul(h1, 0x165667b1) ^ h2) >>> 0;
  if ((s0 | s1 | s2 | s3) === 0) {
    s0 = 0x9e3779b9;
    s1 = 0x243f6a88;
    s2 = 0xb7e15162;
    s3 = 0x85ebca6b;
  }
  return { s0, s1, s2, s3 };
}

/** Advances the stream one step, returning the new state and a uint32 value. */
export function rngNext(state: RngState): { state: RngState; value: number } {
  // xorshift128: each word shifts down one position (s0←s1←s2←s3) and the new
  // s3 mixes the oldest word's feedback with the freshly-computed tap t0 —
  // this keeps all four words rotating through the generator. See Marsaglia,
  // "Xorshift RNGs" (2003), the 128-bit variant.
  const t0 = (state.s0 ^ (state.s0 << 11)) >>> 0;
  const s0 = state.s1;
  const s1 = state.s2;
  const s2 = state.s3;
  const s3 = (state.s3 ^ (state.s3 >>> 19) ^ t0 ^ (t0 >>> 8)) >>> 0;
  return { state: { s0, s1, s2, s3 }, value: s3 };
}

/**
 * Unbiased integer in [0, maxExclusive) using rejection sampling
 * (no modulo bias).
 */
export function rngNextInt(
  state: RngState,
  maxExclusive: number,
): { state: RngState; value: number } {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive integer");
  }
  if (maxExclusive > 0x7fffffff) {
    throw new RangeError("maxExclusive too large");
  }
  const limit = UINT32 - (UINT32 % maxExclusive);
  let current = state;
  for (;;) {
    const step = rngNext(current);
    current = step.state;
    if (step.value < limit) {
      return { state: current, value: step.value % maxExclusive };
    }
  }
}

/**
 * Server-authoritative Fisher-Yates shuffle (§20).
 * Pure: returns a new array and the advanced RNG state.
 */
export function shuffled<T>(
  state: RngState,
  items: readonly T[],
): { state: RngState; items: T[] } {
  const arr = items.slice();
  let current = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const step = rngNextInt(current, i + 1);
    current = step.state;
    const j = step.value;
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return { state: current, items: arr };
}

/** Picks a uniform integer in [0, maxExclusive) and advances the state. */
export function pickUniform(
  state: RngState,
  maxExclusive: number,
): { state: RngState; value: number } {
  return rngNextInt(state, maxExclusive);
}

/**
 * Generates a cryptographically secure seed string.
 * Used by the authoritative server for online matches (§20:
 * "Online games must use cryptographically secure seed generation").
 * Never falls back to Math.random() (§20).
 */
export function generateSecureSeed(): string {
  const webCrypto = globalThis.crypto as
    | { getRandomValues?: (array: Uint8Array) => Uint8Array }
    | undefined;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    let out = "";
    for (const b of bytes) {
      out += b.toString(16).padStart(2, "0");
    }
    return out;
  }
  throw new Error(
    "Secure seed generation requires a runtime with crypto.getRandomValues",
  );
}
