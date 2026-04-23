import { emit, SLICES } from './bus.js';
import { blankMonth } from './state.js';
import { isMonthBoundary, isYearBoundary, monthKey, dayToDate } from './ui/format.js';
import { loanMonthlyPayment } from './formulas.js';
import { VICTORY_EQUITY, CREDIT_LINE } from './data.js';

export function tickDailyFinance(state) {
  // Loan interest accrues daily
  for (const loan of state.finance.loans) {
    const dailyRate = loan.rate / 365;
    const interest = loan.principal * dailyRate;
    state.finance.cash -= interest;
    state.finance.thisMonth.loanInterest += interest;
  }
  // Monthly: close books
  if (isMonthBoundary(state.day)) {
    closeMonth(state);
  }
  if (isYearBoundary(state.day)) {
    closeYear(state);
  }
  // Equity recompute: simplified = cash + asset_value - loan_principal
  const assetValue = state.fleet.reduce((s, eq) => s + eq.buyPrice * (eq.condition / 100) * 0.7, 0) +
                      sumInventory(state);
  const debt = state.finance.loans.reduce((s, l) => s + l.principal, 0);
  state.finance.equity = state.finance.cash + assetValue - debt;

  // Game over / victory check
  if (state.finance.cash < -CREDIT_LINE && !state.flags.gameOver) {
    state.flags.gameOver = true;
    state.flags.gameOverReason = 'Банкротство: денежный поток иссяк.';
    emit(SLICES.CASH);
  }
  if (state.finance.equity >= VICTORY_EQUITY && !state.flags.victory) {
    state.flags.victory = true;
  }
}

function sumInventory(state) {
  let total = 0;
  for (const [mid, qty] of Object.entries(state.materials.inventory)) {
    const price = state.materials.currentPrice[mid] || 0;
    total += price * qty;
  }
  return total;
}

export function closeMonth(state) {
  // Principal repayment of loans (monthly)
  for (let i = state.finance.loans.length - 1; i >= 0; i--) {
    const loan = state.finance.loans[i];
    const payment = loan.monthlyPayment;
    const interestPortion = loan.principal * (loan.rate / 12);
    const principalPortion = Math.max(0, payment - interestPortion);
    state.finance.cash -= principalPortion; // interest already subtracted daily
    loan.principal = Math.max(0, loan.principal - principalPortion);
    loan.remainingMonths--;
    if (loan.principal <= 0 || loan.remainingMonths <= 0) {
      state.finance.loans.splice(i, 1);
    }
  }

  const snapshot = {
    key: monthKey(state.day),
    day: state.day,
    ...state.finance.thisMonth,
    cash: state.finance.cash,
    equity: state.finance.equity,
    profit: state.finance.thisMonth.revenue -
      (state.finance.thisMonth.wages + state.finance.thisMonth.maintenance +
       state.finance.thisMonth.materials + state.finance.thisMonth.marketing +
       state.finance.thisMonth.rd + state.finance.thisMonth.loanInterest +
       state.finance.thisMonth.other + state.finance.thisMonth.branchCosts),
  };
  state.finance.monthly.push(snapshot);
  if (state.finance.monthly.length > 36) state.finance.monthly.shift();
  state.finance.thisMonth = blankMonth();
  state.dayToShowReport = state.day; // trigger modal in UI
  emit(SLICES.FINANCE);
}

export function closeYear(state) {
  const last12 = state.finance.monthly.slice(-12);
  const totals = last12.reduce((a, m) => ({
    revenue: a.revenue + m.revenue,
    profit: a.profit + m.profit,
  }), { revenue: 0, profit: 0 });
  state.finance.yearly.push({ day: state.day, ...totals });
}

export function takeLoan(state, principal, termMonths) {
  const rate = 0.18;
  const monthlyPayment = loanMonthlyPayment(principal, rate, termMonths);
  state.finance.loans.push({
    id: `L${Date.now().toString(36)}`,
    principal,
    originalPrincipal: principal,
    rate,
    termMonths,
    remainingMonths: termMonths,
    monthlyPayment,
    startDay: state.day,
  });
  state.finance.cash += principal;
  emit(SLICES.CASH);
  emit(SLICES.FINANCE);
  return true;
}

export function repayLoanEarly(state, loanId) {
  const idx = state.finance.loans.findIndex(l => l.id === loanId);
  if (idx < 0) return false;
  const loan = state.finance.loans[idx];
  if (state.finance.cash < loan.principal) return false;
  state.finance.cash -= loan.principal;
  state.finance.loans.splice(idx, 1);
  emit(SLICES.CASH);
  emit(SLICES.FINANCE);
  return true;
}
