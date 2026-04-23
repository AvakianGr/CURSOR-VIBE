import { SLICES } from '../bus.js';
import { registerTab } from './render.js';
import { formatRub, formatDate, escapeHtml } from './format.js';
import { MATERIALS } from '../data.js';
import { placeBid } from '../market.js';
import { openModal, closeModal, toast } from './modal.js';
import { estimateWinProbability } from '../formulas.js';
import { buildRng } from '../state.js';

function render(state, el) {
  const open = state.tenders.filter(t => !t.resolved);
  const resolved = state.tenders.filter(t => t.resolved);

  el.innerHTML = `
    <div class="space-y-6">
      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-bold">Открытые тендеры</h3>
          <span class="text-xs text-slate-500 dark:text-slate-400">${open.length} активных</span>
        </div>
        ${open.length === 0 ? '<div class="text-sm text-slate-500 dark:text-slate-400">Пока нет открытых тендеров. Подождите несколько дней.</div>' : `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th class="py-2 pr-3">Тип</th>
                <th class="py-2 pr-3">Город</th>
                <th class="py-2 pr-3">Бюджет</th>
                <th class="py-2 pr-3">Срок</th>
                <th class="py-2 pr-3">Мин. рейтинг</th>
                <th class="py-2 pr-3">До решения</th>
                <th class="py-2 pr-3">Моя ставка</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              ${open.map(t => rowOpen(t, state)).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      ${resolved.length > 0 ? `
      <div class="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        <h3 class="mb-3 text-lg font-bold">Недавние результаты</h3>
        <div class="space-y-2">
          ${resolved.map(t => rowResolved(t, state)).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  el.querySelectorAll('[data-bid]').forEach(b => {
    b.addEventListener('click', () => openBidModal(state, b.dataset.bid));
  });
}

function rowOpen(t, state) {
  const left = t.bidsDeadlineDay - state.day;
  const rep = state.reputation.byCity[t.cityId] ?? state.reputation.global;
  const canBid = rep >= t.minRep;
  const label = canBid ? (t.myBid ? 'Изменить' : 'Подать заявку') : 'Низкий рейтинг';
  const cls = canBid
    ? 'rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500'
    : 'rounded-xl bg-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-not-allowed';
  const attrs = canBid ? `data-bid="${t.id}"` : 'disabled';
  return `
    <tr class="border-t border-white/20 dark:border-white/10">
      <td class="py-2 pr-3 font-semibold">${escapeHtml(t.typeName)}</td>
      <td class="py-2 pr-3">${escapeHtml(t.cityName)}</td>
      <td class="py-2 pr-3 font-mono">${formatRub(t.budgetCap)}</td>
      <td class="py-2 pr-3">${t.deadlineDays} дней</td>
      <td class="py-2 pr-3">${t.minRep}</td>
      <td class="py-2 pr-3">${left <= 0 ? 'сегодня' : `${left} дн.`}</td>
      <td class="py-2 pr-3 font-mono">${t.myBid ? formatRub(t.myBid) : '—'}</td>
      <td class="py-2"><button ${attrs} class="${cls}">${label}</button></td>
    </tr>
  `;
}

function rowResolved(t, state) {
  const won = t.winnerId === 'me';
  const noBid = t.myBid == null;
  const winner = won ? 'Вы' : (t.winnerId ? (t.aiBids?.find(b => b.firmId === t.winnerId)?.firmName ?? 'Конкурент') : 'Нет победителя');
  const bids = (t.aiBids || []).map(b => `${escapeHtml(b.firmName)}: ${formatRub(b.amount)}`).join(' · ');
  const colorCls = won ? 'text-emerald-600 dark:text-emerald-400' : (noBid ? 'text-slate-500' : 'text-rose-500');
  return `
    <div class="rounded-2xl border border-white/20 bg-white/50 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/40">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div><b>${escapeHtml(t.typeName)} · ${escapeHtml(t.cityName)}</b> · бюджет ${formatRub(t.budgetCap)}</div>
        <div class="font-semibold ${colorCls}">${won ? '✅ Выиграли' : (noBid ? 'Не участвовали' : '❌ Проиграли')} — ${escapeHtml(winner)}</div>
      </div>
      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">Ваша ставка: ${t.myBid ? formatRub(t.myBid) : '—'} · ИИ: ${bids || '—'}</div>
    </div>
  `;
}

function openBidModal(state, tenderId) {
  const t = state.tenders.find(x => x.id === tenderId);
  if (!t) return;
  const rng = buildRng(state);
  const matTable = Object.entries(t.materialReq).map(([mid, q]) => {
    const name = MATERIALS.find(m => m.id === mid)?.name || mid;
    return `<tr><td class="py-1 pr-3">${escapeHtml(name)}</td><td class="py-1 font-mono text-right">${q}</td></tr>`;
  }).join('');

  const defaultBid = Math.round(t.budgetCap * 0.85);
  const body = `
    <div class="space-y-4">
      <div class="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800/60">
        <div><b>${escapeHtml(t.typeName)}</b> в ${escapeHtml(t.cityName)}</div>
        <div class="mt-1 text-slate-600 dark:text-slate-300">Бюджет до: <b>${formatRub(t.budgetCap)}</b> · Срок: <b>${t.deadlineDays} дней</b> · Мин. рейтинг: <b>${t.minRep}</b></div>
      </div>
      <div>
        <div class="mb-1 text-sm font-semibold">Требуется материалов</div>
        <table class="w-full text-sm"><tbody>${matTable || '<tr><td class="text-slate-500">—</td></tr>'}</tbody></table>
      </div>
      <div>
        <label class="mb-1 block text-sm font-semibold">Ваша ставка (₽)</label>
        <input type="range" min="${Math.round(t.budgetCap * 0.5)}" max="${t.budgetCap}" step="10000" value="${defaultBid}" data-bid-input class="w-full"/>
        <div class="mt-2 flex items-center justify-between text-sm">
          <span class="text-slate-500">Ставка: <span data-bid-display class="font-bold">${formatRub(defaultBid)}</span></span>
          <span data-winprob class="text-sm font-semibold"></span>
        </div>
      </div>
    </div>
  `;
  const bodyEl = openModal({
    title: `Тендер ${t.id}`,
    body,
    actions: [
      { label: 'Отмена' },
      { label: 'Подать ставку', primary: true, onClick: (bd) => {
        const val = parseInt(bd.querySelector('[data-bid-input]').value, 10);
        const ok = placeBid(state, tenderId, val);
        if (ok) toast('Ставка подана', 'success');
        else toast('Не удалось подать ставку', 'error');
      }},
    ],
  });
  const input = bodyEl.querySelector('[data-bid-input]');
  const disp = bodyEl.querySelector('[data-bid-display]');
  const wp = bodyEl.querySelector('[data-winprob]');
  const updateProb = () => {
    const val = parseInt(input.value, 10);
    disp.textContent = formatRub(val);
    const rep = state.reputation.byCity[t.cityId] ?? state.reputation.global;
    const bidEdge = state.rd.effects.bidEdge || 0;
    const repMult = 1 - (rep - 50) * 0.003 - bidEdge;
    const myEff = val * Math.max(0.5, Math.min(1.3, repMult));
    const p = estimateWinProbability({
      myEffectiveBid: myEff,
      aiFirms: state.ai.slice(0, 3),
      budgetCap: t.budgetCap,
      rng,
      samples: 120,
    });
    wp.textContent = `Шанс победы ~ ${Math.round(p * 100)}%`;
    wp.className = `text-sm font-semibold ${p >= 0.6 ? 'text-emerald-500' : p >= 0.3 ? 'text-amber-500' : 'text-rose-500'}`;
  };
  input.addEventListener('input', updateProb);
  updateProb();
}

registerTab('tenders', render, [SLICES.TIME, SLICES.TENDERS, SLICES.REPUTATION]);
