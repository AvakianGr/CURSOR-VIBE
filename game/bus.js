// Tiny pub/sub. Emits slice names; subscribers receive batches per frame.
const listeners = new Map();
const dirty = new Set();
let flushScheduled = false;

export function on(slice, fn) {
  if (!listeners.has(slice)) listeners.set(slice, new Set());
  listeners.get(slice).add(fn);
  return () => listeners.get(slice)?.delete(fn);
}

export function emit(slice) {
  dirty.add(slice);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);
  }
}

function flush() {
  flushScheduled = false;
  const slices = [...dirty];
  dirty.clear();
  for (const s of slices) {
    const set = listeners.get(s);
    if (!set) continue;
    for (const fn of set) {
      try { fn(s); } catch (e) { console.error('bus listener error', s, e); }
    }
  }
}

export const SLICES = {
  TIME: 'time',
  CASH: 'cash',
  TENDERS: 'tenders',
  PROJECTS: 'projects',
  HR: 'hr',
  FLEET: 'fleet',
  MATERIALS: 'materials',
  FINANCE: 'finance',
  RD: 'rd',
  MAP: 'map',
  REPUTATION: 'reputation',
  EVENTS: 'events',
  UI: 'ui',
};
