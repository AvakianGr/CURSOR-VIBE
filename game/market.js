import {
  TENDER_TYPES, CITIES, MATERIALS, EMPLOYEE_ROLES, EQUIPMENT_TYPES,
  FIRST_NAMES, LAST_NAMES, RESEARCH,
  WAREHOUSE_UPGRADE_COST, WAREHOUSE_UPGRADE_CAP,
} from './data.js';

const RESEARCH_CACHE = Object.fromEntries(RESEARCH.map(r => [r.id, r]));

// Initialize ID counters by scanning existing state (call on boot to avoid collisions after reload)
export function initMarketCounters(state) {
  const extract = (arr, prefix) => arr.reduce((max, x) => {
    const n = parseInt(String(x.id).replace(prefix, ''), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const maxT = Math.max(
    extract(state.tenders || [], 'T'),
  );
  const maxE = Math.max(
    extract(state.employees || [], 'E'),
    extract(state.laborMarket || [], 'E'),
  );
  const maxQ = Math.max(
    extract(state.fleet || [], 'Q'),
    extract(state.rentals || [], 'Q'),
    extract(state.equipmentMarket || [], 'Q'),
  );
  tenderCounter = maxT + 1;
  empCounter = maxE + 1;
  eqCounter = maxQ + 1;
}
import { buildRng } from './state.js';
import { pick, intBetween, between, gauss } from './rng.js';
import { emit, SLICES } from './bus.js';

let tenderCounter = 1;
let empCounter = 1;
let eqCounter = 1;

export function tickDailyMarket(state) {
  const rng = buildRng(state);

  // Material price random walk
  for (const m of MATERIALS) {
    const prev = state.materials.currentPrice[m.id];
    const drift = 1 + gauss(rng, 0, 0.012);
    const seasonal = 1 + 0.05 * Math.sin((state.day / 365) * 2 * Math.PI + hash(m.id));
    let next = prev * drift * seasonal;
    next = Math.max(m.basePrice * m.minMult, Math.min(m.basePrice * m.maxMult, next));
    state.materials.currentPrice[m.id] = Math.round(next);
    const hist = state.materials.priceHistory[m.id];
    hist.push(Math.round(next));
    if (hist.length > 60) hist.shift();
  }
  emit(SLICES.MATERIALS);

  // Expire tenders whose bids deadline passed and resolve
  for (const t of state.tenders) {
    if (t.resolved) continue;
    if (state.day >= t.bidsDeadlineDay) {
      resolveTender(state, t, rng);
    }
  }
  // Remove tenders resolved for more than 3 days
  state.tenders = state.tenders.filter(t => !t.resolved || (state.day - t.bidsDeadlineDay) < 3);

  // Weekly tender refresh (every 7 days)
  if (state.day % 7 === 0 || state.tenders.filter(t => !t.resolved).length < 2) {
    generateTenders(state, rng);
  }

  // Weekly labor market refresh
  if (state.day % 7 === 0 || state.laborMarket.length < 4) {
    refreshLaborMarket(state, rng);
  }

  // Weekly equipment market refresh
  if (state.day % 7 === 0 || state.equipmentMarket.length < 3) {
    refreshEquipmentMarket(state, rng);
  }

  emit(SLICES.TENDERS);
  emit(SLICES.HR);
  emit(SLICES.FLEET);
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function generateTenders(state, rng) {
  const openCities = CITIES.filter(c => state.branches[c.id]?.open);
  const count = intBetween(rng, 3, 6);
  for (let i = 0; i < count; i++) {
    const city = pick(rng, openCities);
    const type = pick(rng, TENDER_TYPES);
    const scale = type.scale * (0.7 + rng() * 1.3);
    const matReq = {};
    let matCost = 0;
    for (const [mid, q] of Object.entries(type.mat)) {
      const qty = Math.round(q * scale);
      if (qty <= 0) continue;
      matReq[mid] = qty;
      matCost += qty * state.materials.currentPrice[mid];
    }
    const duration = intBetween(rng, 20, 70);
    const estWages = duration * 80_000 * scale * city.wageMult;
    const margin = 1.25 + rng() * 0.35; // 25-60% above cost
    const budget = Math.round((matCost + estWages) * margin);
    const minRep = Math.max(0, Math.round(20 + scale * 8));
    const tender = {
      id: `T${tenderCounter++}`,
      type: type.id,
      typeName: type.name,
      cityId: city.id,
      cityName: city.name,
      budgetCap: budget,
      deadlineDays: duration,
      materialReq: matReq,
      skillReq: { foreman: Math.min(10, 2 + Math.ceil(scale)), engineer: Math.min(10, 1 + Math.floor(scale)) },
      minRep,
      postedDay: state.day,
      bidsDeadlineDay: state.day + 3,
      resolved: false,
      myBid: null,
      aiBids: null,
      winnerId: null,
      scale,
      qualityWeight: type.qualityWeight,
    };
    // Premium event: boost budget
    if (state.flags.premiumTendersDays > 0) tender.budgetCap = Math.round(tender.budgetCap * 1.2);
    state.tenders.push(tender);
  }
}

function refreshLaborMarket(state, rng) {
  const candidates = [];
  for (let i = 0; i < 6; i++) {
    candidates.push(makeEmployee(rng, state));
  }
  if (state.flags.talentInMarketDays > 0) {
    candidates.push(makeEmployee(rng, state, { minSkill: 8 }));
  }
  state.laborMarket = candidates;
}

export function makeEmployee(rng, state, opts = {}) {
  const role = pick(rng, EMPLOYEE_ROLES);
  const city = pick(rng, CITIES.filter(c => state.branches[c.id]?.open));
  const skillMin = opts.minSkill ?? 1;
  const skill = intBetween(rng, skillMin, 8);
  const wage = Math.round(role.baseWage * city.wageMult * (0.7 + skill / 10));
  return {
    id: `E${empCounter++}`,
    name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
    role: role.id,
    roleName: role.name,
    category: role.category,
    skill,
    salary: wage,
    morale: 70,
    cityId: city.id,
    assignedProjectId: null,
    hiredDay: state.day,
    recentTrainingDays: 0,
    recentBonusDays: 0,
  };
}

function refreshEquipmentMarket(state, rng) {
  const items = [];
  for (let i = 0; i < 5; i++) {
    const t = pick(rng, EQUIPMENT_TYPES);
    items.push(makeEquipment(rng, state, t));
  }
  state.equipmentMarket = items;
}

export function makeEquipment(rng, state, type) {
  return {
    id: `Q${eqCounter++}`,
    typeId: type.id,
    typeName: type.name,
    buyPrice: type.buyPrice,
    rentPerDay: type.rentPerDay,
    maintPerDay: type.maintPerDay,
    powerRating: type.powerRating,
    condition: intBetween(rng, 75, 100),
    brokenDays: 0,
    assignedProjectId: null,
    mode: null, // 'owned' or 'rented'
    rentalDaysLeft: 0,
  };
}

function resolveTender(state, tender, rng) {
  const openCity = CITIES.find(c => c.id === tender.cityId);
  const aiFirms = state.ai;
  const bids = [];

  // Player bid if any
  if (tender.myBid != null) {
    const rep = state.reputation.byCity[tender.cityId] ?? state.reputation.global;
    const bidEdge = state.rd.effects.bidEdge || 0;
    const effMe = effectiveBidLocal(tender.myBid, rep, bidEdge);
    bids.push({ kind: 'me', firmId: 'me', amount: tender.myBid, effective: effMe });
  }

  // AI bids (number depends on city competition)
  const aiCount = Math.max(1, Math.round(aiFirms.length * (openCity?.competition ?? 1)));
  const aiList = aiFirms.slice(0, aiCount);
  const storedAiBids = [];
  for (const f of aiList) {
    const bid = aiBidLocal(tender.budgetCap, f, rng);
    const eff = effectiveBidLocal(bid, f.reputation, 0);
    bids.push({ kind: 'ai', firmId: f.id, firmName: f.name, amount: bid, effective: eff });
    storedAiBids.push({ firmId: f.id, firmName: f.name, amount: bid });
  }

  // Lowest effective wins (but must also be below budgetCap × 0.95)
  bids.sort((a, b) => a.effective - b.effective);
  const winner = bids.find(b => b.amount <= tender.budgetCap);
  tender.aiBids = storedAiBids;
  tender.resolved = true;

  if (!winner) {
    tender.winnerId = null;
    return;
  }
  tender.winnerId = winner.firmId;

  if (winner.kind === 'me') {
    // Create active project
    const project = createProjectFromTender(state, tender);
    state.activeProjects.push(project);
    emit(SLICES.PROJECTS);
  } else {
    // AI firm wins; reputation slight boost
    const firm = state.ai.find(f => f.id === winner.firmId);
    if (firm) firm.wins = (firm.wins || 0) + 1;
  }
}

function effectiveBidLocal(bid, reputation, bidEdge = 0) {
  const repMult = 1 - (reputation - 50) * 0.003 - bidEdge;
  return bid * Math.max(0.5, Math.min(1.3, repMult));
}

function aiBidLocal(budgetCap, firm, rng) {
  const base = budgetCap * (0.72 + 0.20 * firm.aggressiveness);
  const repAdj = 1 - (firm.reputation - 50) / 400;
  const noise = 0.92 + rng() * 0.16;
  return Math.round(base * repAdj * noise);
}

function createProjectFromTender(state, tender) {
  const totalWork = Math.round(100 * tender.scale * 10); // work units
  return {
    id: `P${tender.id}`,
    tenderId: tender.id,
    typeName: tender.typeName,
    cityId: tender.cityId,
    cityName: tender.cityName,
    contractAmount: tender.myBid,
    totalWork,
    workDone: 0,
    requiredMaterials: { ...tender.materialReq },
    consumedMaterials: Object.fromEntries(Object.keys(tender.materialReq).map(k => [k, 0])),
    assignedCrew: [],
    assignedEquipment: [],
    qualityAccum: 0,
    qualityDays: 0,
    startedDay: state.day,
    deadlineDay: state.day + tender.deadlineDays,
    status: 'in_progress',
    qualityWeight: tender.qualityWeight,
    scale: tender.scale,
  };
}

export function placeBid(state, tenderId, amount) {
  const t = state.tenders.find(x => x.id === tenderId);
  if (!t || t.resolved) return false;
  const rep = state.reputation.byCity[t.cityId] ?? state.reputation.global;
  if (rep < t.minRep) return false;
  if (amount > t.budgetCap) return false;
  t.myBid = Math.round(amount);
  emit(SLICES.TENDERS);
  return true;
}

export function buyMaterial(state, materialId, qty) {
  const price = state.materials.currentPrice[materialId];
  const totalCost = price * qty;
  const inv = state.materials.inventory;
  const totalInv = Object.values(inv).reduce((s, x) => s + x, 0);
  const cap = state.materials.warehouseCap + (state.rd.effects.warehouseBonus || 0);
  if (totalInv + qty > cap) return { ok: false, reason: 'Не хватает места на складе' };
  if (state.finance.cash < totalCost) return { ok: false, reason: 'Недостаточно средств' };
  state.finance.cash -= totalCost;
  state.finance.thisMonth.materials += totalCost;
  inv[materialId] = (inv[materialId] || 0) + qty;
  emit(SLICES.MATERIALS);
  emit(SLICES.CASH);
  return { ok: true };
}

export function hireEmployee(state, candidateId) {
  const idx = state.laborMarket.findIndex(c => c.id === candidateId);
  if (idx < 0) return false;
  const c = state.laborMarket.splice(idx, 1)[0];
  c.hiredDay = state.day;
  state.employees.push(c);
  emit(SLICES.HR);
  return true;
}

export function fireEmployee(state, empId) {
  const idx = state.employees.findIndex(e => e.id === empId);
  if (idx < 0) return false;
  const e = state.employees[idx];
  if (e.assignedProjectId) {
    const p = state.activeProjects.find(p => p.id === e.assignedProjectId);
    if (p) p.assignedCrew = p.assignedCrew.filter(x => x !== empId);
  }
  state.employees.splice(idx, 1);
  emit(SLICES.HR);
  return true;
}

export function trainEmployee(state, empId) {
  const e = state.employees.find(e => e.id === empId);
  if (!e) return { ok: false, reason: 'Нет сотрудника' };
  if (e.skill >= 10) return { ok: false, reason: 'Максимальный навык' };
  const cost = e.skill * 50_000;
  if (state.finance.cash < cost) return { ok: false, reason: 'Нет денег' };
  state.finance.cash -= cost;
  state.finance.thisMonth.other += cost;
  e.skill++;
  e.recentTrainingDays = 14;
  emit(SLICES.HR);
  emit(SLICES.CASH);
  return { ok: true };
}

export function bonusEmployee(state, empId) {
  const e = state.employees.find(e => e.id === empId);
  if (!e) return { ok: false };
  const cost = e.salary * 10;
  if (state.finance.cash < cost) return { ok: false, reason: 'Нет денег' };
  state.finance.cash -= cost;
  state.finance.thisMonth.other += cost;
  e.morale = Math.min(100, e.morale + 15);
  e.recentBonusDays = 14;
  emit(SLICES.HR);
  emit(SLICES.CASH);
  return { ok: true, cost };
}

export function assignEmployee(state, empId, projectId) {
  const e = state.employees.find(x => x.id === empId);
  if (!e) return false;
  if (e.category !== 'field') return false;
  if (e.assignedProjectId) {
    const prev = state.activeProjects.find(p => p.id === e.assignedProjectId);
    if (prev) prev.assignedCrew = prev.assignedCrew.filter(x => x !== empId);
  }
  if (!projectId) {
    e.assignedProjectId = null;
  } else {
    const p = state.activeProjects.find(p => p.id === projectId);
    if (!p) return false;
    p.assignedCrew = Array.from(new Set([...p.assignedCrew, empId]));
    e.assignedProjectId = projectId;
  }
  emit(SLICES.HR);
  emit(SLICES.PROJECTS);
  return true;
}

export function assignEquipment(state, eqId, projectId) {
  const eq = [...state.fleet, ...state.rentals].find(x => x.id === eqId);
  if (!eq) return false;
  if (eq.assignedProjectId) {
    const prev = state.activeProjects.find(p => p.id === eq.assignedProjectId);
    if (prev) prev.assignedEquipment = prev.assignedEquipment.filter(x => x !== eqId);
  }
  if (!projectId) {
    eq.assignedProjectId = null;
  } else {
    const p = state.activeProjects.find(p => p.id === projectId);
    if (!p) return false;
    p.assignedEquipment = Array.from(new Set([...p.assignedEquipment, eqId]));
    eq.assignedProjectId = projectId;
  }
  emit(SLICES.FLEET);
  emit(SLICES.PROJECTS);
  return true;
}

export function buyEquipment(state, marketId) {
  const idx = state.equipmentMarket.findIndex(x => x.id === marketId);
  if (idx < 0) return false;
  const eq = state.equipmentMarket[idx];
  if (state.finance.cash < eq.buyPrice) return false;
  state.finance.cash -= eq.buyPrice;
  state.finance.thisMonth.other += eq.buyPrice;
  eq.mode = 'owned';
  state.fleet.push(eq);
  state.equipmentMarket.splice(idx, 1);
  emit(SLICES.FLEET);
  emit(SLICES.CASH);
  return true;
}

export function rentEquipment(state, marketId, days) {
  const idx = state.equipmentMarket.findIndex(x => x.id === marketId);
  if (idx < 0) return false;
  const eq = state.equipmentMarket[idx];
  const cost = eq.rentPerDay * days;
  if (state.finance.cash < cost) return false;
  state.finance.cash -= cost;
  state.finance.thisMonth.other += cost;
  eq.mode = 'rented';
  eq.rentalDaysLeft = days;
  state.rentals.push(eq);
  state.equipmentMarket.splice(idx, 1);
  emit(SLICES.FLEET);
  emit(SLICES.CASH);
  return true;
}

export function sellEquipment(state, eqId) {
  const idx = state.fleet.findIndex(x => x.id === eqId);
  if (idx < 0) return false;
  const eq = state.fleet[idx];
  const price = Math.round(eq.buyPrice * 0.5 * (eq.condition / 100));
  if (eq.assignedProjectId) {
    const p = state.activeProjects.find(p => p.id === eq.assignedProjectId);
    if (p) p.assignedEquipment = p.assignedEquipment.filter(x => x !== eqId);
  }
  state.finance.cash += price;
  state.fleet.splice(idx, 1);
  emit(SLICES.FLEET);
  emit(SLICES.CASH);
  return true;
}

export function repairEquipment(state, eqId) {
  const eq = [...state.fleet, ...state.rentals].find(x => x.id === eqId);
  if (!eq) return false;
  const cost = Math.round(eq.buyPrice * 0.002 * (100 - eq.condition));
  if (state.finance.cash < cost) return false;
  state.finance.cash -= cost;
  state.finance.thisMonth.maintenance += cost;
  eq.condition = 100;
  eq.brokenDays = 0;
  emit(SLICES.FLEET);
  emit(SLICES.CASH);
  return true;
}

export function openBranch(state, cityId) {
  const city = CITIES.find(c => c.id === cityId);
  if (!city) return false;
  if (state.branches[cityId]?.open) return false;
  if (state.finance.cash < city.branchCost) return false;
  state.finance.cash -= city.branchCost;
  state.finance.thisMonth.branchCosts += city.branchCost;
  state.branches[cityId] = { open: true, openedDay: state.day };
  emit(SLICES.MAP);
  emit(SLICES.CASH);
  return true;
}

export function startResearch(state, rid) {
  const r = RESEARCH_CACHE[rid];
  if (!r) return false;
  if (state.rd.inProgress) return false;
  if (state.rd.completed.includes(rid)) return false;
  if (!r.prereq.every(p => state.rd.completed.includes(p))) return false;
  if (state.finance.cash < r.cost) return false;
  state.finance.cash -= r.cost;
  state.finance.thisMonth.rd += r.cost;
  state.rd.inProgress = { id: rid, remainingDays: r.days };
  emit(SLICES.RD);
  emit(SLICES.CASH);
  return true;
}

export function upgradeWarehouse(state) {
  if (state.finance.cash < WAREHOUSE_UPGRADE_COST) return false;
  state.finance.cash -= WAREHOUSE_UPGRADE_COST;
  state.finance.thisMonth.other += WAREHOUSE_UPGRADE_COST;
  state.materials.warehouseCap += WAREHOUSE_UPGRADE_CAP;
  emit(SLICES.MATERIALS);
  emit(SLICES.CASH);
  return true;
}
