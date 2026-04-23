// Pure math. No side effects, no imports from stateful modules.

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

export function moraleFactor(morale) {
  return 0.4 + (morale / 100) * 0.8; // 0.4..1.2
}

export function conditionFactor(condition) {
  return 0.3 + (condition / 100) * 0.7; // 0.3..1.0
}

// Power contribution of assigned employees
export function crewPower(assignedEmployees, roles) {
  let total = 0;
  for (const e of assignedEmployees) {
    const role = roles.find((r) => r.id === e.role);
    const pm = role ? role.powerMult : 1;
    total += e.skill * pm * moraleFactor(e.morale);
  }
  return total;
}

// Power contribution of assigned equipment
export function equipPower(assignedEquipment) {
  let total = 0;
  for (const eq of assignedEquipment) {
    if (eq.brokenDays > 0) continue;
    total += eq.powerRating * conditionFactor(eq.condition);
  }
  return total;
}

// Daily work units added to a project
export function dailyProgress({
  crewPow, equipPow, hasMaterials, speedBonus = 0,
  nightShiftMult = 1, weatherDelayDays = 0,
}) {
  if (weatherDelayDays > 0) return 0;
  const base = 10;
  const matGate = hasMaterials ? 1 : 0.15;
  return base * (crewPow * 0.6 + equipPow * 0.4) * matGate * (1 + speedBonus) * nightShiftMult;
}

// AI firm bid on a tender budget
export function aiBid(budgetCap, firm, rng) {
  const base = budgetCap * (0.72 + 0.20 * firm.aggressiveness);
  const repAdj = 1 - (firm.reputation - 50) / 400;
  const noise = 0.92 + rng() * 0.16;
  return Math.round(base * repAdj * noise);
}

// Effective bid used for tender resolution (lower wins)
export function effectiveBid(bid, reputation, bidEdge = 0) {
  const repMult = 1 - (reputation - 50) * 0.003 - bidEdge;
  return bid * clamp(repMult, 0.5, 1.3);
}

// Reputation delta on completion
export function repDelta({ onTime, qualityScore, amount, repBonusMult = 1, typeQualityWeight = 1 }) {
  const base = onTime ? 3 : -5;
  const qualBonus = (qualityScore - 0.5) * 6 * typeQualityWeight;
  const sizeMult = clamp(amount / 5_000_000, 0.5, 2);
  return (base + qualBonus) * sizeMult * repBonusMult;
}

export function moraleDelta(emp, { isPaidMarketWage, isOverworked, recentTraining, recentBonus }) {
  let d = 0;
  d += isPaidMarketWage ? 0.1 : -0.3;
  if (isOverworked) d -= 0.4;
  if (recentTraining) d += 0.5;
  if (recentBonus) d += 1.0;
  return d;
}

export function dailyMaintenance(basePrice, condition, discount = 0) {
  return basePrice * 0.0002 * (2 - condition / 100) * (1 - discount);
}

export function breakdownChance(condition) {
  return 0.002 * (1 - condition / 100);
}

export function loanMonthlyPayment(principal, annualRate, termMonths) {
  const r = annualRate / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

// Monte Carlo-ish win probability (used for live estimator)
export function estimateWinProbability({ myEffectiveBid, aiFirms, budgetCap, rng, samples = 150 }) {
  let wins = 0;
  for (let i = 0; i < samples; i++) {
    let minAi = Infinity;
    for (const f of aiFirms) {
      const b = aiBid(budgetCap, f, rng);
      const eff = effectiveBid(b, f.reputation);
      if (eff < minAi) minAi = eff;
    }
    if (myEffectiveBid < minAi) wins++;
  }
  return wins / samples;
}
