import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, escapeHtml } from './format.js';
import { hireEmployee, fireEmployee, trainEmployee, bonusEmployee } from '../market.js';
import { toast } from './modal.js';

function render(state, el) {
  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-bold">Команда (${state.employees.length})</h3>
          <div class="text-xs text-slate-500 dark:text-slate-400">ФОТ в день: ${formatRub(state.employees.reduce((s, e) => s + e.salary, 0))}</div>
        </div>
        ${state.employees.length === 0 ? '<div class="text-sm text-slate-500">Пока никого не нанято.</div>' : `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th class="py-2 pr-3">Имя</th>
                <th class="py-2 pr-3">Роль</th>
                <th class="py-2 pr-3">Навык</th>
                <th class="py-2 pr-3">Мораль</th>
                <th class="py-2 pr-3">Зарплата/день</th>
                <th class="py-2 pr-3">Статус</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>${state.employees.map(empRow).join('')}</tbody>
          </table>
        </div>`}
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Рынок труда</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${state.laborMarket.map(candidateCard).join('') || '<div class="text-sm text-slate-500">Ждите обновления рынка труда.</div>'}
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-hire]').forEach(b => b.addEventListener('click', () => {
    if (hireEmployee(state, b.dataset.hire)) toast('Сотрудник нанят', 'success');
  }));
  el.querySelectorAll('[data-fire]').forEach(b => b.addEventListener('click', () => {
    if (fireEmployee(state, b.dataset.fire)) toast('Уволен', 'warn');
  }));
  el.querySelectorAll('[data-train]').forEach(b => b.addEventListener('click', () => {
    const r = trainEmployee(state, b.dataset.train);
    if (!r.ok) toast(r.reason || 'Ошибка', 'error'); else toast('Навык повышен', 'success');
  }));
  el.querySelectorAll('[data-bonus]').forEach(b => b.addEventListener('click', () => {
    const r = bonusEmployee(state, b.dataset.bonus);
    if (!r.ok) toast(r.reason || 'Ошибка', 'error'); else toast('Бонус выплачен', 'success');
  }));
}

function empRow(e) {
  const moraleCls = e.morale < 30 ? 'text-rose-500' : e.morale < 60 ? 'text-amber-500' : 'text-emerald-500';
  return `
    <tr class="border-t border-white/20 dark:border-white/10">
      <td class="py-2 pr-3 font-semibold">${escapeHtml(e.name)}</td>
      <td class="py-2 pr-3">${escapeHtml(e.roleName)}</td>
      <td class="py-2 pr-3">${e.skill}/10</td>
      <td class="py-2 pr-3 ${moraleCls}">${Math.round(e.morale)}</td>
      <td class="py-2 pr-3 font-mono">${formatRub(e.salary)}</td>
      <td class="py-2 pr-3">${e.assignedProjectId ? '<span class="text-indigo-500">на проекте</span>' : 'свободен'}</td>
      <td class="py-2">
        <div class="flex gap-1">
          <button data-train="${e.id}" class="rounded-lg border border-indigo-500/40 px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">Обучить</button>
          <button data-bonus="${e.id}" class="rounded-lg border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Премия</button>
          <button data-fire="${e.id}" class="rounded-lg border border-rose-500/40 px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Уволить</button>
        </div>
      </td>
    </tr>
  `;
}

function candidateCard(c) {
  return `
    <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-semibold">${escapeHtml(c.name)}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(c.roleName)} · Навык ${c.skill}/10</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 dark:text-slate-400">Зарплата</div>
          <div class="font-bold">${formatRub(c.salary)}</div>
        </div>
      </div>
      <button data-hire="${c.id}" class="mt-3 w-full rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-indigo-500">Нанять</button>
    </div>
  `;
}

registerTab('hr', render, [SLICES.TIME, SLICES.HR, SLICES.CASH]);
