import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, escapeHtml } from './format.js';
import { MATERIALS, WAREHOUSE_UPGRADE_COST } from '../data.js';
import { buyMaterial, upgradeWarehouse } from '../market.js';
import { toast } from './modal.js';

function render(state, el) {
  const totalInv = Object.values(state.materials.inventory).reduce((s, x) => s + x, 0);
  const cap = state.materials.warehouseCap + (state.rd.effects.warehouseBonus || 0);
  const pct = Math.round((totalInv / cap) * 100);
  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-lg font-bold">Склад</h3>
          <div class="flex items-center gap-3 text-sm">
            <span class="text-slate-500 dark:text-slate-400">${totalInv.toLocaleString('ru-RU')} / ${cap.toLocaleString('ru-RU')} ед.</span>
            <button data-upgrade class="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">Расширить (+3000) · ${formatRub(WAREHOUSE_UPGRADE_COST)}</button>
          </div>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full ${pct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}" style="width:${Math.min(100, pct)}%"></div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        ${MATERIALS.map(m => matCard(m, state)).join('')}
      </div>
    </div>
  `;

  el.querySelector('[data-upgrade]')?.addEventListener('click', () => {
    if (upgradeWarehouse(state)) toast('Склад расширен', 'success'); else toast('Нет средств', 'error');
  });
  el.querySelectorAll('[data-buy-mat]').forEach(b => b.addEventListener('click', () => {
    const mid = b.dataset.buyMat;
    const qty = parseInt(el.querySelector(`[data-qty-mat="${mid}"]`).value, 10);
    if (!qty || qty <= 0) return;
    const res = buyMaterial(state, mid, qty);
    if (!res.ok) toast(res.reason || 'Ошибка', 'error'); else toast('Куплено', 'success');
  }));
}

function matCard(m, state) {
  const price = state.materials.currentPrice[m.id];
  const hist = state.materials.priceHistory[m.id] || [];
  const inv = state.materials.inventory[m.id] || 0;
  const delta = hist.length >= 2 ? (price - hist[hist.length - 2]) / Math.max(1, hist[hist.length - 2]) : 0;
  const deltaCls = delta > 0.005 ? 'text-rose-500' : delta < -0.005 ? 'text-emerald-500' : 'text-slate-500';
  const deltaStr = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`;
  return `
    <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-bold">${escapeHtml(m.name)}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Ед. изм: ${escapeHtml(m.unit)} · Запас: <b>${inv.toLocaleString('ru-RU')}</b></div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold">${formatRub(price)}/${escapeHtml(m.unit)}</div>
          <div class="text-xs ${deltaCls}">${deltaStr} за день</div>
        </div>
      </div>
      <div class="mt-3">${priceChart(hist)}</div>
      <div class="mt-3 flex items-center gap-2">
        <input type="number" min="1" value="100" data-qty-mat="${m.id}" class="w-28 rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"/>
        <button data-buy-mat="${m.id}" class="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">Купить</button>
      </div>
    </div>
  `;
}

function priceChart(hist) {
  if (hist.length < 2) return '';
  const W = 300, H = 40;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const range = Math.max(1, max - min);
  const step = W / (hist.length - 1);
  const pts = hist.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-10"><polyline fill="none" stroke="#6366f1" stroke-width="1.5" points="${pts}"/></svg>`;
}

registerTab('materials', render, [SLICES.TIME, SLICES.MATERIALS, SLICES.CASH]);
