import { EMPLOYEE_ROLES } from './data.js';
import { dailyProgress, crewPower, equipPower, repDelta, breakdownChance, dailyMaintenance, moraleDelta } from './formulas.js';
import { emit, SLICES } from './bus.js';
import { buildRng } from './state.js';

export function tickDailyProjects(state) {
  const rng = buildRng(state);

  // Pay wages
  let wages = 0;
  for (const e of state.employees) {
    state.finance.cash -= e.salary;
    wages += e.salary;
    // Morale changes
    const isPaidMarketWage = true;
    const isOverworked = e.assignedProjectId != null && findProjectLoad(state, e.assignedProjectId) > 10;
    const recentTraining = e.recentTrainingDays > 0;
    const recentBonus = e.recentBonusDays > 0;
    const d = moraleDelta(e, { isPaidMarketWage, isOverworked, recentTraining, recentBonus });
    e.morale = Math.max(0, Math.min(100, e.morale + d));
    if (e.recentTrainingDays > 0) e.recentTrainingDays--;
    if (e.recentBonusDays > 0) e.recentBonusDays--;
    // Attrition
    if (e.morale < 20 && rng() < 0.02) {
      // Quits — remove from employees; unassign
      if (e.assignedProjectId) {
        const p = state.activeProjects.find(p => p.id === e.assignedProjectId);
        if (p) p.assignedCrew = p.assignedCrew.filter(id => id !== e.id);
      }
      e._quit = true;
    }
  }
  state.finance.thisMonth.wages += wages;
  state.employees = state.employees.filter(e => !e._quit);

  // Equipment maintenance & condition decay
  let maintCost = 0;
  for (const eq of [...state.fleet, ...state.rentals]) {
    if (eq.brokenDays > 0) { eq.brokenDays--; continue; }
    const active = eq.assignedProjectId != null;
    if (active) {
      eq.condition = Math.max(0, eq.condition - 0.3);
      const discount = state.rd.effects.maintDiscount || 0;
      const c = dailyMaintenance(eq.buyPrice, eq.condition, discount);
      maintCost += c;
      if (rng() < breakdownChance(eq.condition)) {
        eq.brokenDays = 5;
      }
    }
  }
  // Rentals pay per day usage
  for (let i = state.rentals.length - 1; i >= 0; i--) {
    const r = state.rentals[i];
    r.rentalDaysLeft--;
    if (r.rentalDaysLeft <= 0) {
      if (r.assignedProjectId) {
        const p = state.activeProjects.find(p => p.id === r.assignedProjectId);
        if (p) p.assignedEquipment = p.assignedEquipment.filter(x => x !== r.id);
      }
      state.rentals.splice(i, 1);
    }
  }
  state.finance.cash -= maintCost;
  state.finance.thisMonth.maintenance += maintCost;

  // R&D progress
  if (state.rd.inProgress) {
    state.rd.inProgress.remainingDays--;
    if (state.rd.inProgress.remainingDays <= 0) {
      const id = state.rd.inProgress.id;
      state.rd.completed.push(id);
      state.rd.inProgress = null;
      rebuildResearchEffects(state);
      emit(SLICES.RD);
    } else {
      emit(SLICES.RD);
    }
  }

  // Daily project progress
  for (const p of state.activeProjects) {
    if (p.status !== 'in_progress') continue;
    const crew = p.assignedCrew.map(id => state.employees.find(e => e.id === id)).filter(Boolean);
    const equip = p.assignedEquipment.map(id => [...state.fleet, ...state.rentals].find(e => e.id === id)).filter(Boolean);

    // Check materials - we need a daily share
    const daysLeftForWork = Math.max(1, p.deadlineDay - state.day);
    const matDiscount = state.rd.effects.matDiscount || 0;
    const totalWorkLeft = Math.max(1, p.totalWork - p.workDone);

    // Consume materials proportionally to progress today
    // Determine daily material requirement
    let hasMaterials = true;
    for (const [mid, qty] of Object.entries(p.requiredMaterials)) {
      const consumed = p.consumedMaterials[mid] || 0;
      const remainingQty = qty * (1 - matDiscount) - consumed;
      if (remainingQty <= 0) continue;
      const dailyNeed = Math.min(remainingQty, remainingQty / daysLeftForWork * 2);
      const inv = state.materials.inventory[mid] || 0;
      if (inv < dailyNeed) { hasMaterials = false; break; }
    }

    const speedBonus = state.rd.effects.speedBonus || 0;
    const nightShiftMult = state.flags.nightShiftBoost > 0 ? 2 : 1;
    const weatherDelayDays = state.flags.weatherDelayDays;
    const cp = crewPower(crew, EMPLOYEE_ROLES);
    const ep = equipPower(equip);
    const prog = dailyProgress({ crewPow: cp, equipPow: ep, hasMaterials, speedBonus, nightShiftMult, weatherDelayDays });
    p.workDone += prog;

    if (prog > 0 && hasMaterials) {
      for (const [mid, qty] of Object.entries(p.requiredMaterials)) {
        const consumedSoFar = p.consumedMaterials[mid] || 0;
        const targetConsumed = Math.min(qty * (1 - matDiscount), qty * (1 - matDiscount) * (p.workDone / p.totalWork));
        const deltaConsume = Math.max(0, targetConsumed - consumedSoFar);
        if (deltaConsume > 0) {
          state.materials.inventory[mid] = Math.max(0, (state.materials.inventory[mid] || 0) - deltaConsume);
          p.consumedMaterials[mid] = consumedSoFar + deltaConsume;
        }
      }
      // Quality points
      const avgSkill = crew.length ? crew.reduce((s, e) => s + e.skill, 0) / crew.length : 0;
      const avgMorale = crew.length ? crew.reduce((s, e) => s + e.morale, 0) / crew.length : 0;
      const qualityPoint = (avgSkill / 10) * 0.6 + (avgMorale / 100) * 0.3 + (state.rd.effects.qualityBonus || 0) * 0.1;
      p.qualityAccum += qualityPoint;
      p.qualityDays++;
    }

    // Completion
    if (p.workDone >= p.totalWork) {
      completeProject(state, p);
    } else if (state.day > p.deadlineDay + 10) {
      failProject(state, p);
    }
  }

  // Drop completed/failed from active list
  state.activeProjects = state.activeProjects.filter(p => p.status === 'in_progress');

  emit(SLICES.CASH);
  emit(SLICES.PROJECTS);
  emit(SLICES.HR);
  emit(SLICES.FLEET);
  emit(SLICES.MATERIALS);
}

function findProjectLoad(state, projectId) {
  const p = state.activeProjects.find(p => p.id === projectId);
  if (!p) return 0;
  return p.assignedCrew.length;
}

function completeProject(state, p) {
  p.status = 'done';
  const amount = p.contractAmount;
  state.finance.cash += amount;
  state.finance.thisMonth.revenue += amount;
  state.finance.totalRevenue += amount;
  const qualityScore = p.qualityDays > 0 ? Math.min(1, p.qualityAccum / p.qualityDays) : 0.5;
  const onTime = state.day <= p.deadlineDay;
  const delta = repDelta({
    onTime,
    qualityScore,
    amount,
    repBonusMult: state.rd.effects.repBonusMult || 1,
    typeQualityWeight: p.qualityWeight || 1,
  });
  state.reputation.global = Math.max(0, Math.min(100, state.reputation.global + delta));
  state.reputation.byCity[p.cityId] = Math.max(0, Math.min(100, (state.reputation.byCity[p.cityId] || 0) + delta * 1.2));
  state.completedProjects.push({ ...p, qualityScore, finishedDay: state.day, onTime });
  state.events.log.unshift({ day: state.day, text: `Проект сдан: ${p.typeName} в ${p.cityName} (+${Math.round(delta)} репутации)` });
  // Unassign crew/equipment
  for (const empId of p.assignedCrew) {
    const e = state.employees.find(x => x.id === empId);
    if (e) e.assignedProjectId = null;
  }
  for (const eqId of p.assignedEquipment) {
    const eq = [...state.fleet, ...state.rentals].find(x => x.id === eqId);
    if (eq) eq.assignedProjectId = null;
  }
}

function failProject(state, p) {
  p.status = 'failed';
  const penalty = Math.round(p.contractAmount * 0.2);
  state.finance.cash -= penalty;
  state.finance.thisMonth.other += penalty;
  state.reputation.global = Math.max(0, state.reputation.global - 8);
  state.reputation.byCity[p.cityId] = Math.max(0, (state.reputation.byCity[p.cityId] || 0) - 10);
  state.completedProjects.push({ ...p, qualityScore: 0, finishedDay: state.day, onTime: false });
  state.events.log.unshift({ day: state.day, text: `Проект провален: ${p.typeName} в ${p.cityName} (−8 репутации, штраф ${Math.round(penalty / 1000)} тыс ₽)` });
  for (const empId of p.assignedCrew) {
    const e = state.employees.find(x => x.id === empId);
    if (e) e.assignedProjectId = null;
  }
  for (const eqId of p.assignedEquipment) {
    const eq = [...state.fleet, ...state.rentals].find(x => x.id === eqId);
    if (eq) eq.assignedProjectId = null;
  }
}

export function rebuildResearchEffects(state) {
  const eff = { speedBonus: 0, qualityBonus: 0, moraleBonus: 0, matDiscount: 0, maintDiscount: 0, repBonusMult: 1, bidEdge: 0, warehouseBonus: 0, bigContracts: false };
  for (const id of state.rd.completed) {
    const r = RESEARCH_MAP[id];
    if (!r) continue;
    const e = r.effect;
    if (e.speedBonus) eff.speedBonus += e.speedBonus;
    if (e.qualityBonus) eff.qualityBonus += e.qualityBonus;
    if (e.moraleBonus) eff.moraleBonus += e.moraleBonus;
    if (e.matDiscount) eff.matDiscount += e.matDiscount;
    if (e.maintDiscount) eff.maintDiscount += e.maintDiscount;
    if (e.repBonusMult) eff.repBonusMult = Math.max(eff.repBonusMult, e.repBonusMult);
    if (e.bidEdge) eff.bidEdge += e.bidEdge;
    if (e.warehouseBonus) eff.warehouseBonus += e.warehouseBonus;
    if (e.bigContracts) eff.bigContracts = true;
  }
  state.rd.effects = eff;
}

import { RESEARCH } from './data.js';
const RESEARCH_MAP = Object.fromEntries(RESEARCH.map(r => [r.id, r]));
