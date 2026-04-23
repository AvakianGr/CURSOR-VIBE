import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, escapeHtml } from './format.js';
import { RESEARCH } from '../data.js';
import { startResearch } from '../market.js';
import { toast } from './modal.js';

function render(state, el) {
  el.innerHTML = `
    <div class="space-y-4">
      ${state.rd.inProgress ? `
        <div class="rounded-3xl border border-indigo-500/40 bg-indigo-50 p-5 shadow dark:bg-indigo-500/10">
          <div class="flex items-center justify-between">
            <div><b>В разработке:</b> ${escapeHtml(lookup(state.rd.inProgress.id).name)}</div>
            <div class="text-sm">Осталось: <b>${state.rd.inProgress.remainingDays}</b> дн.</div>
          </div>
        </div>` : ''}

      <div class="grid gap-3 lg:grid-cols-2">
        ${RESEARCH.map(r => card(r, state)).join('')}
      </div>
    </div>
  `;
  el.querySelectorAll('[data-research]').forEach(b => b.addEventListener('click', () => {
    if (startResearch(state, b.dataset.research)) toast('Исследование начато', 'success'); else toast('Требования не выполнены', 'error');
  }));
}

function card(r, state) {
  const completed = state.rd.completed.includes(r.id);
  const inProg = state.rd.inProgress?.id === r.id;
  const prereqOk = r.prereq.every(p => state.rd.completed.includes(p));
  const canStart = !completed && !inProg && prereqOk && !state.rd.inProgress && state.finance.cash >= r.cost;
  const status = completed ? '<span class="text-emerald-500">Завершено</span>' : inProg ? '<span class="text-indigo-500">В процессе</span>' : prereqOk ? '<span class="text-slate-500">Доступно</span>' : '<span class="text-rose-500">Требуется: ' + r.prereq.map(p => lookup(p).name).join(', ') + '</span>';
  return `
    <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50 ${completed ? 'opacity-70' : ''}">
      <div class="flex items-center justify-between">
        <div class="font-bold">${escapeHtml(r.name)}</div>
        <div class="text-xs">${status}</div>
      </div>
      <div class="mt-1 text-sm text-slate-600 dark:text-slate-300">${escapeHtml(r.desc)}</div>
      <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">Стоимость: <b>${formatRub(r.cost)}</b> · Время: ${r.days} дн.</div>
      <button data-research="${r.id}" ${canStart ? '' : 'disabled'} class="mt-3 w-full rounded-xl px-3 py-1.5 text-sm font-semibold ${canStart ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}">${completed ? 'Завершено' : inProg ? 'В процессе' : 'Начать'}</button>
    </div>
  `;
}

function lookup(id) { return RESEARCH.find(r => r.id === id) || { name: id }; }

registerTab('rd', render, [SLICES.TIME, SLICES.RD, SLICES.CASH]);
