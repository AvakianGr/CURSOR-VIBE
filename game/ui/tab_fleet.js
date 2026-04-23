import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, escapeHtml } from './format.js';
import { buyEquipment, rentEquipment, sellEquipment, repairEquipment } from '../market.js';
import { openModal, toast } from './modal.js';

function render(state, el) {
  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Собственный парк (${state.fleet.length})</h3>
        ${state.fleet.length === 0 ? '<div class="text-sm text-slate-500">Нет собственной техники.</div>' : `
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${state.fleet.map(eq => ownedCard(eq, state)).join('')}
        </div>`}
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Арендованная техника (${state.rentals.length})</h3>
        ${state.rentals.length === 0 ? '<div class="text-sm text-slate-500">Нет арендованной техники.</div>' : `
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${state.rentals.map(eq => rentedCard(eq, state)).join('')}
        </div>`}
      </div>

      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Магазин техники</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${state.equipmentMarket.map(eq => marketCard(eq)).join('') || '<div class="text-sm text-slate-500">Ждите обновления магазина.</div>'}
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
    if (buyEquipment(state, b.dataset.buy)) toast('Техника куплена', 'success'); else toast('Не хватает денег', 'error');
  }));
  el.querySelectorAll('[data-rent]').forEach(b => b.addEventListener('click', () => rentModal(state, b.dataset.rent)));
  el.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => {
    if (sellEquipment(state, b.dataset.sell)) toast('Техника продана', 'success');
  }));
  el.querySelectorAll('[data-repair]').forEach(b => b.addEventListener('click', () => {
    if (repairEquipment(state, b.dataset.repair)) toast('Отремонтировано', 'success'); else toast('Нет денег', 'error');
  }));
}

function ownedCard(eq, state) {
  const pct = Math.round(eq.condition);
  const pctCls = pct < 30 ? 'text-rose-500' : pct < 60 ? 'text-amber-500' : 'text-emerald-500';
  return `
    <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
      <div class="flex items-start justify-between">
        <div class="font-bold">${escapeHtml(eq.typeName)}</div>
        <div class="text-xs ${pctCls}">${pct}%</div>
      </div>
      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Мощность ${eq.powerRating} · Обсл. ${formatRub(eq.maintPerDay)}/день</div>
      <div class="mt-1 text-xs">${eq.assignedProjectId ? '<span class="text-indigo-500">на проекте</span>' : 'свободна'} ${eq.brokenDays > 0 ? `<span class="text-rose-500">· сломана (${eq.brokenDays} дн.)</span>` : ''}</div>
      <div class="mt-3 flex gap-1">
        <button data-repair="${eq.id}" class="flex-1 rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Ремонт</button>
        <button data-sell="${eq.id}" class="flex-1 rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">Продать</button>
      </div>
    </div>
  `;
}

function rentedCard(eq, state) {
  return `
    <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
      <div class="flex items-start justify-between">
        <div class="font-bold">${escapeHtml(eq.typeName)}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400">аренда</div>
      </div>
      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Осталось: ${eq.rentalDaysLeft} дн. · ${formatRub(eq.rentPerDay)}/день</div>
      <div class="mt-1 text-xs">${eq.assignedProjectId ? '<span class="text-indigo-500">на проекте</span>' : 'свободна'}</div>
    </div>
  `;
}

function marketCard(eq) {
  return `
    <div class="rounded-2xl border border-white/30 bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
      <div class="font-bold">${escapeHtml(eq.typeName)}</div>
      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Мощность ${eq.powerRating} · Состояние ${Math.round(eq.condition)}%</div>
      <div class="mt-2 text-sm">Покупка: <b>${formatRub(eq.buyPrice)}</b></div>
      <div class="text-sm">Аренда: <b>${formatRub(eq.rentPerDay)}</b>/день</div>
      <div class="mt-3 flex gap-1">
        <button data-buy="${eq.id}" class="flex-1 rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500">Купить</button>
        <button data-rent="${eq.id}" class="flex-1 rounded-lg border border-indigo-500/40 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">Арендовать</button>
      </div>
    </div>
  `;
}

function rentModal(state, eqId) {
  const eq = state.equipmentMarket.find(x => x.id === eqId);
  if (!eq) return;
  openModal({
    title: `Аренда: ${eq.typeName}`,
    body: `
      <label class="mb-1 block text-sm font-semibold">Срок аренды, дней</label>
      <input type="number" min="5" max="180" value="30" data-days class="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"/>
      <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">Ставка: ${formatRub(eq.rentPerDay)}/день. Итого: <span data-total class="font-bold">${formatRub(eq.rentPerDay * 30)}</span></div>
    `,
    actions: [
      { label: 'Отмена' },
      { label: 'Арендовать', primary: true, onClick: (bd) => {
        const days = parseInt(bd.querySelector('[data-days]').value, 10);
        if (rentEquipment(state, eqId, days)) toast('Техника арендована', 'success'); else toast('Нет средств', 'error');
      } },
    ],
  });
  setTimeout(() => {
    const daysInp = document.querySelector('[data-days]');
    const tot = document.querySelector('[data-total]');
    daysInp?.addEventListener('input', () => {
      const d = parseInt(daysInp.value, 10) || 0;
      tot.textContent = formatRub(eq.rentPerDay * d);
    });
  }, 0);
}

registerTab('fleet', render, [SLICES.TIME, SLICES.FLEET, SLICES.CASH]);
