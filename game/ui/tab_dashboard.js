import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, formatDate, escapeHtml } from './format.js';
import { CITIES } from '../data.js';

function render(state, el) {
  const activeProjects = state.activeProjects.length;
  const employees = state.employees.length;
  const completed = state.completedProjects.length;
  const cash = state.finance.cash;
  const spark = cashSparkline(state.cashHistory);

  el.innerHTML = `
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="col-span-full rounded-3xl border border-white/40 bg-white/70 p-6 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Денежный поток (90 дней)</div>
            <div class="mt-1 text-3xl font-black">${formatRub(cash)}</div>
          </div>
          <div class="w-full max-w-md">${spark}</div>
        </div>
      </div>

      ${card('Активных проектов', activeProjects, '🏗️')}
      ${card('Сотрудников', employees, '👷')}
      ${card('Завершено проектов', completed, '🏁')}

      <div class="col-span-full rounded-3xl border border-white/40 bg-white/70 p-6 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold">Репутация по городам</h3>
          <span class="text-xs text-slate-500 dark:text-slate-400">Глобальная: ${Math.round(state.reputation.global)}/100</span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${CITIES.map(c => {
            const rep = Math.round(state.reputation.byCity[c.id] ?? 0);
            const branch = state.branches[c.id]?.open ? 'Филиал открыт' : 'Нет филиала';
            return `
              <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
                <div class="flex items-center justify-between">
                  <div class="font-semibold">${escapeHtml(c.name)}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">${branch}</div>
                </div>
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style="width:${rep}%"></div>
                </div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">${rep}/100</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="col-span-full rounded-3xl border border-white/40 bg-white/70 p-6 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Лента событий</h3>
        <div class="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
          ${state.events.log.slice(0, 30).map(ev => `
            <div class="flex gap-3 rounded-xl border border-white/20 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/40">
              <div class="shrink-0 text-xs font-mono text-slate-500 dark:text-slate-400">${formatDate(ev.day)}</div>
              <div class="text-slate-700 dark:text-slate-200">${escapeHtml(ev.text)}</div>
            </div>
          `).join('') || '<div class="text-sm text-slate-500 dark:text-slate-400">Пока событий нет.</div>'}
        </div>
      </div>
    </div>
  `;
}

function card(label, value, icon) {
  return `
    <div class="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-xl text-white">${icon}</div>
        <div>
          <div class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">${label}</div>
          <div class="text-3xl font-black">${value}</div>
        </div>
      </div>
    </div>
  `;
}

function cashSparkline(hist) {
  if (!hist || hist.length < 2) return '';
  const W = 400, H = 60;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const range = Math.max(1, max - min);
  const step = W / (hist.length - 1);
  const pts = hist.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-16">
    <polyline fill="none" stroke="url(#grad)" stroke-width="2" points="${pts}"/>
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
  </svg>`;
}

registerTab('dashboard', render, [SLICES.TIME, SLICES.CASH, SLICES.PROJECTS, SLICES.HR, SLICES.REPUTATION, SLICES.EVENTS, SLICES.MAP]);
