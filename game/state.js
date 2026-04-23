import {
  START_CASH, START_REPUTATION, CITIES, MATERIALS, AI_FIRMS,
  WAREHOUSE_BASE_CAP,
} from './data.js';
import { createRng } from './rng.js';

const SAVE_KEY = 'ci2-save-v1';
const CURRENT_VERSION = 1;

export function newGame({ companyName = 'Моя Компания', hqCity = 'msk', seed = Date.now() >>> 0, difficulty = 'normal' } = {}) {
  const cash = START_CASH[difficulty] ?? START_CASH.normal;
  const initialPrices = {};
  const priceHistory = {};
  for (const m of MATERIALS) {
    initialPrices[m.id] = m.basePrice;
    priceHistory[m.id] = [m.basePrice];
  }

  const byCity = {};
  for (const c of CITIES) byCity[c.id] = (c.id === hqCity) ? START_REPUTATION + 10 : START_REPUTATION;

  const branches = {};
  for (const c of CITIES) branches[c.id] = { open: c.id === hqCity, openedDay: 0 };

  return {
    version: CURRENT_VERSION,
    seed,
    rngState: seed,
    day: 0,
    speed: 1,
    paused: true,
    difficulty,
    company: { name: companyName, hqCity, foundedDay: 0, logoHue: Math.floor((seed % 360)) },
    finance: {
      cash,
      startingCash: cash,
      equity: cash,
      loans: [],
      monthly: [],
      yearly: [],
      thisMonth: blankMonth(),
      totalRevenue: 0,
      totalCost: 0,
    },
    reputation: { global: START_REPUTATION, byCity },
    branches,
    tenders: [],
    activeProjects: [],
    completedProjects: [],
    employees: [],
    laborMarket: [],
    fleet: [],
    rentals: [],
    equipmentMarket: [],
    materials: {
      inventory: Object.fromEntries(MATERIALS.map(m => [m.id, 100])),
      warehouseCap: WAREHOUSE_BASE_CAP,
      currentPrice: initialPrices,
      priceHistory,
    },
    rd: { completed: [], inProgress: null, effects: {} },
    ai: AI_FIRMS.map(f => ({ ...f, cash: 10_000_000, wins: 0 })),
    events: { active: null, log: [], cooldownDays: 5 },
    flags: {
      weatherDelayDays: 0,
      nightShiftBoost: 0,
      premiumTendersDays: 0,
      talentInMarketDays: 0,
      gameOver: false,
      gameOverReason: null,
      victory: false,
    },
    cashHistory: [cash],
    dayToShowReport: 0,
    ui: { activeTab: 'dashboard', settings: { reducedMotion: false } },
  };
}

export function blankMonth() {
  return {
    revenue: 0,
    wages: 0,
    maintenance: 0,
    materials: 0,
    marketing: 0,
    rd: 0,
    loanInterest: 0,
    other: 0,
    branchCosts: 0,
  };
}

export function buildRng(state) {
  const rng = createRng(state.rngState);
  const wrap = () => {
    const v = rng();
    state.rngState = rng.state();
    return v;
  };
  wrap.state = rng.state;
  wrap.setState = rng.setState;
  return wrap;
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('save failed', e);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return migrate(s);
  } catch (e) {
    console.error('load failed', e);
    return null;
  }
}

export function reset() {
  try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
}

function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  if (!s.version) s.version = 1;
  // Future migrations: if (s.version < 2) { ...; s.version = 2; }
  return s;
}

export function exportJson(state) {
  return JSON.stringify(state, null, 2);
}

export function importJson(text) {
  const s = JSON.parse(text);
  return migrate(s);
}
