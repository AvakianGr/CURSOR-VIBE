import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, escapeHtml } from './format.js';
import { CITIES } from '../data.js';
import { openBranch } from '../market.js';
import { toast } from './modal.js';

function render(state, el) {
  el.innerHTML = `
    <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <h3 class="mb-3 text-lg font-bold">Города</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th class="py-2 pr-3">Город</th>
              <th class="py-2 pr-3">Рынок</th>
              <th class="py-2 pr-3">Зарплаты</th>
              <th class="py-2 pr-3">Конкуренция</th>
              <th class="py-2 pr-3">Репутация</th>
              <th class="py-2 pr-3">Филиал</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            ${CITIES.map(c => row(c, state)).join('')}
          </tbody>
        </table>
      </div>

      <h3 class="mt-6 mb-3 text-lg font-bold">Конкуренты</h3>
      <div class="grid gap-3 sm:grid-cols-3">
        ${state.ai.map(f => `
          <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
            <div class="font-bold">${escapeHtml(f.name)}</div>
            <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Репутация: ${Math.round(f.reputation)} · Побед: ${f.wins || 0}</div>
            <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Агрессивность: ${Math.round(f.aggressiveness * 100)}%</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  el.querySelectorAll('[data-open-branch]').forEach(b => b.addEventListener('click', () => {
    if (openBranch(state, b.dataset.openBranch)) toast('Филиал открыт', 'success'); else toast('Нет средств', 'error');
  }));
}

function row(c, state) {
  const open = state.branches[c.id]?.open;
  const rep = Math.round(state.reputation.byCity[c.id] ?? 0);
  return `
    <tr class="border-t border-white/20 dark:border-white/10">
      <td class="py-2 pr-3 font-semibold">${escapeHtml(c.name)}</td>
      <td class="py-2 pr-3">${Math.round(c.marketSize * 100)}%</td>
      <td class="py-2 pr-3">×${c.wageMult.toFixed(2)}</td>
      <td class="py-2 pr-3">×${c.competition.toFixed(2)}</td>
      <td class="py-2 pr-3">${rep}</td>
      <td class="py-2 pr-3">${open ? '<span class="text-emerald-500">Открыт</span>' : '<span class="text-slate-500">Нет</span>'}</td>
      <td class="py-2">${open ? '' : `<button data-open-branch="${c.id}" class="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500">Открыть · ${formatRub(c.branchCost)}</button>`}</td>
    </tr>
  `;
}

registerTab('map', render, [SLICES.TIME, SLICES.MAP, SLICES.REPUTATION, SLICES.CASH]);
