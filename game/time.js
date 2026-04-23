import { DAY_MS_AT_1X } from './data.js';
import { emit, SLICES } from './bus.js';
import { save } from './state.js';
import { isMonthBoundary, isYearBoundary, monthKey } from './ui/format.js';

let state = null;
let acc = 0;
let lastTs = 0;
let rafId = null;
let daily = [];

export function mountLoop(s, dailyHandlers) {
  state = s;
  daily = dailyHandlers || [];
  if (rafId) cancelAnimationFrame(rafId);
  lastTs = 0;
  acc = 0;
  rafId = requestAnimationFrame(frame);
}

export function unmountLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function frame(ts) {
  if (!state) return;
  const dt = lastTs ? Math.min(ts - lastTs, 250) : 0;
  lastTs = ts;
  const mult = state.paused ? 0 : state.speed;
  if (mult > 0) {
    acc += dt * mult;
    while (acc >= DAY_MS_AT_1X && !state.flags.gameOver && !state.flags.victory) {
      acc -= DAY_MS_AT_1X;
      advanceOneDay();
    }
  }
  rafId = requestAnimationFrame(frame);
}

function advanceOneDay() {
  state.day += 1;

  // decay short-term flags
  if (state.flags.weatherDelayDays > 0) state.flags.weatherDelayDays--;
  if (state.flags.nightShiftBoost > 0)  state.flags.nightShiftBoost--;
  if (state.flags.premiumTendersDays > 0) state.flags.premiumTendersDays--;
  if (state.flags.talentInMarketDays > 0) state.flags.talentInMarketDays--;

  for (const fn of daily) {
    try { fn(state); } catch (e) { console.error('daily handler failed', e); }
  }

  if (isMonthBoundary(state.day)) {
    // monthly events emitted via FINANCE slice by finance module
    emit(SLICES.FINANCE);
  }

  // autosave every 10 days
  if (state.day % 10 === 0) save(state);

  // cash history sample (every day, keep last 90)
  state.cashHistory.push(state.finance.cash);
  if (state.cashHistory.length > 90) state.cashHistory.shift();

  emit(SLICES.TIME);
}

export function setSpeed(s, speed) {
  s.speed = speed;
  s.paused = false;
  emit(SLICES.TIME);
}

export function togglePause(s) {
  s.paused = !s.paused;
  emit(SLICES.TIME);
}

export { isMonthBoundary, isYearBoundary, monthKey };
