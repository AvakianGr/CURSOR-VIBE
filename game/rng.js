// Mulberry32 seeded PRNG with persistable state.
export function createRng(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.state = () => s;
  rng.setState = (v) => { s = v >>> 0; };
  return rng;
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(rng, p) {
  return rng() < p;
}

export function between(rng, min, max) {
  return min + rng() * (max - min);
}

export function intBetween(rng, min, max) {
  return Math.floor(between(rng, min, max + 1));
}

export function gauss(rng, mean = 0, std = 1) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function weightedPick(rng, items, weightFn) {
  const total = items.reduce((s, x) => s + weightFn(x), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weightFn(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}
