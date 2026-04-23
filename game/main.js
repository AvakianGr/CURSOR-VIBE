import { newGame, load, save, reset } from './state.js';
import { mountLoop, setSpeed, togglePause } from './time.js';
import { tickDailyMarket, initMarketCounters } from './market.js';
import { tickDailyProjects, rebuildResearchEffects } from './projects.js';
import { tickDailyFinance } from './finance.js';
import { tickDailyAi } from './ai.js';
import { tickDailyEvents, resolveActiveEvent } from './events.js';
import { CITIES } from './data.js';
import { emit, SLICES, on } from './bus.js';
import { initModal, openModal, closeModal, toast } from './ui/modal.js';
import { mountRender, showTab, renderActive } from './ui/render.js';
import { mountTopbar } from './ui/topbar.js';
import { formatRub, escapeHtml } from './ui/format.js';

// Register tabs (side-effect imports)
import './ui/tab_dashboard.js';
import './ui/tab_tenders.js';
import './ui/tab_projects.js';
import './ui/tab_hr.js';
import './ui/tab_fleet.js';
import './ui/tab_materials.js';
import './ui/tab_finance.js';
import './ui/tab_rd.js';
import './ui/tab_map.js';
import './ui/tab_settings.js';

let state;

function boot() {
  initModal();
  const loaded = load();
  if (loaded) {
    state = loaded;
    rebuildResearchEffects(state);
    startRunning();
  } else {
    showNewGameWizard();
  }
}

function startRunning() {
  initMarketCounters(state);
  mountTopbar(state);
  mountRender(state);
  wireTabs();
  wireKeyboard();
  wireEventModalListener();
  wireMonthlyReport();
  wireGameOverWatch();
  mountLoop(state, [
    tickDailyMarket,
    tickDailyAi,
    tickDailyProjects,
    tickDailyFinance,
    tickDailyEvents,
  ]);
  // initial render
  emit(SLICES.TIME);
  emit(SLICES.CASH);
  emit(SLICES.TENDERS);
  emit(SLICES.PROJECTS);
  emit(SLICES.HR);
  emit(SLICES.FLEET);
  emit(SLICES.MATERIALS);
  emit(SLICES.FINANCE);
  emit(SLICES.RD);
  emit(SLICES.MAP);
  emit(SLICES.REPUTATION);
  emit(SLICES.EVENTS);

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(state);
  });
}

function wireTabs() {
  document.getElementById('tabs-rail')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    showTab(btn.dataset.tab);
  });
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePause(state); }
    else if (e.key === '1') setSpeed(state, 1);
    else if (e.key === '2') setSpeed(state, 2);
    else if (e.key === '4') setSpeed(state, 4);
  });
}

function wireEventModalListener() {
  on(SLICES.EVENTS, () => {
    const active = state.events.active;
    if (!active) return;
    if (document.querySelector('[data-event-modal]')) return; // already open
    const body = `<div data-event-modal><p class="text-sm text-slate-600 dark:text-slate-300">${escapeHtml(active.desc)}</p></div>`;
    openModal({
      title: active.title,
      body,
      dismissible: false,
      actions: active.choices.map((c, i) => ({
        label: c.label,
        primary: i === 0,
        onClick: () => { resolveActiveEvent(state, i); },
      })),
      size: 'md',
    });
  });
}

function wireMonthlyReport() {
  let lastReportDay = 0;
  on(SLICES.FINANCE, () => {
    if (state.dayToShowReport && state.dayToShowReport !== lastReportDay && state.finance.monthly.length > 0) {
      lastReportDay = state.dayToShowReport;
      const last = state.finance.monthly[state.finance.monthly.length - 1];
      const profitCls = last.profit >= 0 ? 'text-emerald-500' : 'text-rose-500';
      const body = `
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span>Месяц</span><b>${escapeHtml(last.key)}</b></div>
          <div class="flex justify-between"><span>Выручка</span><b>${formatRub(last.revenue)}</b></div>
          <div class="flex justify-between"><span>ФОТ</span><b>${formatRub(last.wages)}</b></div>
          <div class="flex justify-between"><span>Материалы</span><b>${formatRub(last.materials)}</b></div>
          <div class="flex justify-between"><span>Техника</span><b>${formatRub(last.maintenance)}</b></div>
          <div class="flex justify-between"><span>R&D</span><b>${formatRub(last.rd)}</b></div>
          <div class="flex justify-between"><span>Проценты</span><b>${formatRub(last.loanInterest)}</b></div>
          <div class="flex justify-between"><span>Прочее</span><b>${formatRub(last.other + last.branchCosts + last.marketing)}</b></div>
          <div class="flex justify-between border-t border-white/20 pt-2 dark:border-white/10"><span>Прибыль</span><b class="${profitCls}">${formatRub(last.profit)}</b></div>
          <div class="flex justify-between"><span>Касса</span><b>${formatRub(last.cash)}</b></div>
        </div>
      `;
      openModal({
        title: `Отчёт за месяц ${last.key}`,
        body,
        actions: [{ label: 'Продолжить', primary: true }],
        size: 'sm',
      });
    }
  });
}

function wireGameOverWatch() {
  on(SLICES.CASH, () => {
    if (state.flags.gameOver && !document.querySelector('[data-gameover]')) {
      openModal({
        title: '💀 Игра окончена',
        body: `<div data-gameover><p class="text-sm">${escapeHtml(state.flags.gameOverReason || 'Банкротство.')}</p><p class="mt-2 text-xs text-slate-500">Дни в игре: ${state.day} · Завершено проектов: ${state.completedProjects.length}</p></div>`,
        dismissible: false,
        actions: [{ label: 'Начать заново', primary: true, onClick: () => { reset(); location.reload(); } }],
      });
    }
    if (state.flags.victory && !document.querySelector('[data-victory]')) {
      openModal({
        title: '🏆 Победа!',
        body: `<div data-victory><p class="text-sm">Вы достигли чистого капитала 500 млн ₽!</p><p class="mt-2 text-xs text-slate-500">Дни в игре: ${state.day} · Завершено проектов: ${state.completedProjects.length}</p></div>`,
        dismissible: false,
        actions: [
          { label: 'Продолжить', onClick: () => { state.flags.victory = false; } },
          { label: 'Новая игра', primary: true, onClick: () => { reset(); location.reload(); } },
        ],
      });
    }
  });
}

function showNewGameWizard() {
  const cityOptions = CITIES.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const body = `
    <div class="space-y-3">
      <div>
        <label class="mb-1 block text-sm font-semibold">Название компании</label>
        <input type="text" value="СтройВайб" data-name class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"/>
      </div>
      <div>
        <label class="mb-1 block text-sm font-semibold">Головной офис</label>
        <select data-hq class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">${cityOptions}</select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-semibold">Сложность</label>
        <select data-diff class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <option value="easy">Лёгкая (5 млн ₽)</option>
          <option value="normal" selected>Средняя (3 млн ₽)</option>
          <option value="hard">Сложная (1,5 млн ₽)</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-semibold">Сид (для повторяемости)</label>
        <input type="number" value="${Date.now() >>> 0}" data-seed class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"/>
      </div>
    </div>
  `;
  openModal({
    title: 'Новая стройка 🏗️',
    body,
    dismissible: false,
    actions: [
      { label: 'Начать', primary: true, onClick: (bd) => {
        const companyName = bd.querySelector('[data-name]').value.trim() || 'СтройВайб';
        const hqCity = bd.querySelector('[data-hq]').value;
        const difficulty = bd.querySelector('[data-diff]').value;
        const seed = parseInt(bd.querySelector('[data-seed]').value, 10) >>> 0 || (Date.now() >>> 0);
        state = newGame({ companyName, hqCity, difficulty, seed });
        save(state);
        closeModal();
        startRunning();
      }},
    ],
    size: 'md',
  });
}

boot();
