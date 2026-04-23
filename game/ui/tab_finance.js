import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, formatDate, escapeHtml } from './format.js';
import { takeLoan, repayLoanEarly } from '../finance.js';
import { openModal, toast } from './modal.js';
import { loanMonthlyPayment } from '../formulas.js';

function render(state, el) {
  const m = state.finance.thisMonth;
  const monthly = state.finance.monthly.slice(-12);
  const assetsValue = state.fleet.reduce((s, eq) => s + eq.buyPrice * (eq.condition / 100) * 0.7, 0);
  const invValue = Object.entries(state.materials.inventory).reduce((s, [mid, q]) => s + q * (state.materials.currentPrice[mid] || 0), 0);
  const debt = state.finance.loans.reduce((s, l) => s + l.principal, 0);

  el.innerHTML = `
    <div class="space-y-4">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
          <h3 class="mb-2 text-lg font-bold">P&amp;L текущего месяца</h3>
          <table class="w-full text-sm">
            ${plRow('Выручка', m.revenue, 'text-emerald-500')}
            ${plRow('ФОТ', -m.wages)}
            ${plRow('Материалы', -m.materials)}
            ${plRow('Обслуживание техники', -m.maintenance)}
            ${plRow('Маркетинг', -m.marketing)}
            ${plRow('R&D', -m.rd)}
            ${plRow('Проценты по кредитам', -m.loanInterest)}
            ${plRow('Филиалы', -m.branchCosts)}
            ${plRow('Прочее', -m.other)}
          </table>
          <div class="mt-3 border-t border-white/20 pt-2 text-right font-bold dark:border-white/10">
            Чистая прибыль: <span class="${(m.revenue - (m.wages + m.materials + m.maintenance + m.marketing + m.rd + m.loanInterest + m.branchCosts + m.other)) >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatRub(m.revenue - (m.wages + m.materials + m.maintenance + m.marketing + m.rd + m.loanInterest + m.branchCosts + m.other))}</span>
          </div>
        </div>

        <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
          <h3 class="mb-2 text-lg font-bold">Баланс</h3>
          <table class="w-full text-sm">
            <tr><td class="py-1 font-semibold" colspan="2">Активы</td></tr>
            ${plRow('Касса', state.finance.cash, state.finance.cash < 0 ? 'text-rose-500' : '')}
            ${plRow('Техника', assetsValue)}
            ${plRow('Материалы', invValue)}
            <tr><td class="py-1 pt-3 font-semibold" colspan="2">Обязательства</td></tr>
            ${plRow('Долг по кредитам', -debt)}
          </table>
          <div class="mt-3 border-t border-white/20 pt-2 text-right font-bold dark:border-white/10">
            Чистый капитал: <span class="${state.finance.equity >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatRub(state.finance.equity)}</span>
          </div>
        </div>
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Последние 12 месяцев</h3>
        ${monthly.length === 0 ? '<div class="text-sm text-slate-500">Нет данных за прошедшие месяцы.</div>' : `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr><th class="py-1 pr-3">Месяц</th><th class="py-1 pr-3">Выручка</th><th class="py-1 pr-3">Прибыль</th><th class="py-1 pr-3">Касса</th></tr>
            </thead>
            <tbody>
              ${monthly.map(s => `<tr class="border-t border-white/20 dark:border-white/10"><td class="py-1 pr-3 font-mono">${escapeHtml(s.key)}</td><td class="py-1 pr-3 font-mono">${formatRub(s.revenue)}</td><td class="py-1 pr-3 font-mono ${s.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}">${formatRub(s.profit)}</td><td class="py-1 pr-3 font-mono">${formatRub(s.cash)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-bold">Кредиты</h3>
          <button data-take-loan class="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">Взять кредит</button>
        </div>
        ${state.finance.loans.length === 0 ? '<div class="text-sm text-slate-500">Нет активных кредитов.</div>' : `
        <div class="space-y-2">
          ${state.finance.loans.map(l => loanCard(l)).join('')}
        </div>`}
      </div>
    </div>
  `;

  el.querySelector('[data-take-loan]')?.addEventListener('click', () => takeLoanModal(state));
  el.querySelectorAll('[data-repay]').forEach(b => b.addEventListener('click', () => {
    if (repayLoanEarly(state, b.dataset.repay)) toast('Кредит погашен', 'success'); else toast('Нет средств', 'error');
  }));
}

function plRow(label, value, cls = '') {
  return `<tr><td class="py-1 pr-3 text-slate-600 dark:text-slate-300">${escapeHtml(label)}</td><td class="py-1 text-right font-mono ${cls}">${formatRub(value)}</td></tr>`;
}

function loanCard(l) {
  return `
    <div class="rounded-2xl border border-white/20 bg-white/50 p-3 text-sm dark:border-white/10 dark:bg-slate-900/40">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><b>${formatRub(l.originalPrincipal)}</b> под ${(l.rate * 100).toFixed(1)}%</div>
        <div>Остаток: <b>${formatRub(l.principal)}</b></div>
        <div>Платёж: ${formatRub(l.monthlyPayment)}/мес</div>
        <div>Осталось: ${l.remainingMonths} мес.</div>
        <button data-repay="${l.id}" class="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Погасить</button>
      </div>
    </div>
  `;
}

function takeLoanModal(state) {
  openModal({
    title: 'Взять кредит',
    body: `
      <label class="mb-1 block text-sm font-semibold">Сумма (₽)</label>
      <input type="number" min="500000" max="50000000" step="100000" value="2000000" data-amount class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"/>
      <label class="mt-3 mb-1 block text-sm font-semibold">Срок (месяцев)</label>
      <select data-term class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <option value="12">12</option><option value="24" selected>24</option><option value="36">36</option><option value="60">60</option>
      </select>
      <div class="mt-3 text-sm text-slate-500 dark:text-slate-400">Ставка: 18% годовых. Ежемесячный платёж: <span data-payment class="font-bold"></span></div>
    `,
    actions: [
      { label: 'Отмена' },
      { label: 'Взять', primary: true, onClick: (bd) => {
        const amt = parseInt(bd.querySelector('[data-amount]').value, 10);
        const term = parseInt(bd.querySelector('[data-term]').value, 10);
        takeLoan(state, amt, term);
        toast('Кредит получен', 'success');
      }},
    ],
  });
  const update = () => {
    const amtEl = document.querySelector('[data-amount]');
    const termEl = document.querySelector('[data-term]');
    const payEl = document.querySelector('[data-payment]');
    if (!amtEl || !payEl) return;
    const amt = parseInt(amtEl.value, 10) || 0;
    const term = parseInt(termEl.value, 10) || 12;
    payEl.textContent = formatRub(loanMonthlyPayment(amt, 0.18, term));
  };
  setTimeout(() => {
    document.querySelector('[data-amount]')?.addEventListener('input', update);
    document.querySelector('[data-term]')?.addEventListener('change', update);
    update();
  }, 0);
}

registerTab('finance', render, [SLICES.TIME, SLICES.CASH, SLICES.FINANCE]);
