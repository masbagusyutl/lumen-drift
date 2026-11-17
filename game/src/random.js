// A tiny seeded random generator (mulberry32). A run is fully decided by its
// seed: the same seed always drifts the same field, which is what makes the
// staged screenshot scenes reproducible byte for byte.

export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** An integer in [min, max], both ends included. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** -1 or 1, for spins and drift directions. */
    sign() {
      return next() < 0.5 ? -1 : 1;
    }
  };
}
