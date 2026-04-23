import { SLICES, on } from '../bus.js';
import { formatRub, formatDate, escapeHtml } from './format.js';
import { setSpeed, togglePause } from '../time.js';
import { save } from '../state.js';

let root;
let state;

export function mountTopbar(s) {
  state = s;
  root = document.getElementById('topbar');
  render();
  on(SLICES.TIME, render);
  on(SLICES.CASH, render);
  on(SLICES.REPUTATION, render);
  on(SLICES.FINANCE, render);
}

function render() {
  if (!root) return;
  const speed = state.speed;
  const paused = state.paused;
  const cash = state.finance.cash;
  const cashClass = cash < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400';
  root.innerHTML = `
    <div class="sticky top-16 z-20 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:bg-slate-950/60 dark:border-white/10">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-lg text-white shadow">🏗️</span>
            <div class="leading-tight">
              <div class="text-sm font-bold">${escapeHtml(state.company.name)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Строительная Империя</div>
            </div>
          </div>
          <div class="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          <div class="flex items-center gap-4 text-sm">
            <div>
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Касса</div>
              <div class="font-bold ${cashClass}" title="${cash.toLocaleString('ru-RU')} ₽">${formatRub(cash)}</div>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Капитал</div>
              <div class="font-bold">${formatRub(state.finance.equity)}</div>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Дата</div>
              <div class="font-bold">${formatDate(state.day)}</div>
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Репутация</div>
              <div class="font-bold">${Math.round(state.reputation.global)}/100</div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          ${btn('pause', paused, '⏸', 'Пауза (Space)')}
          ${btn('1', !paused && speed === 1, '1×', '1× (клавиша 1)')}
          ${btn('2', !paused && speed === 2, '2×', '2× (клавиша 2)')}
          ${btn('4', !paused && speed === 4, '4×', '4× (клавиша 4)')}
          <div class="mx-1 h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          <button id="topbar-save" class="rounded-xl border border-white/40 bg-white/70 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-slate-800/80 dark:hover:bg-slate-800">💾 Сохранить</button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-speed]').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.dataset.speed;
      if (v === 'pause') togglePause(state);
      else setSpeed(state, parseInt(v, 10));
    });
  });
  document.getElementById('topbar-save')?.addEventListener('click', () => {
    save(state);
    const tick = document.createElement('span');
    tick.className = 'ml-1 text-emerald-500';
    tick.textContent = '✓';
    root.querySelector('#topbar-save')?.appendChild(tick);
    setTimeout(() => tick.remove(), 1400);
  });
}

function btn(speed, active, label, title) {
  const activeCls = 'bg-indigo-600 text-white border-indigo-600 shadow';
  const idleCls = 'bg-white/70 text-slate-800 border-white/40 hover:bg-white dark:bg-slate-800/80 dark:text-slate-100 dark:border-white/10 dark:hover:bg-slate-800';
  return `<button data-speed="${speed}" title="${title}" class="rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${active ? activeCls : idleCls}">${label}</button>`;
}
